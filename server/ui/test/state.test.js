import test from 'node:test';
import assert from 'node:assert/strict';
import { createDaemonClient } from '../js/api.js';
import { createAppStore } from '../js/state.js';

function createFakeTimers() {
  let nextId = 1;
  const intervals = new Map();
  const timeouts = new Map();

  return {
    setIntervalImpl(fn, ms) {
      const id = nextId++;
      intervals.set(id, { fn, ms });
      return id;
    },
    clearIntervalImpl(id) {
      intervals.delete(id);
    },
    setTimeoutImpl(fn, ms) {
      const id = nextId++;
      timeouts.set(id, { fn, ms });
      return id;
    },
    clearTimeoutImpl(id) {
      timeouts.delete(id);
    },
    async tickIntervals() {
      for (const { fn } of [...intervals.values()]) {
        await fn();
      }
    },
    async flushTimeouts() {
      for (const [id, { fn }] of [...timeouts.entries()]) {
        timeouts.delete(id);
        await fn();
      }
    },
    get activeIntervals() { return intervals.size; },
    get activeTimeouts() { return timeouts.size; },
  };
}

function createMockDocument() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of [...(listeners.get(type) || [])]) fn();
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

function createInMemoryDaemon() {
  const sseInstances = [];
  const state = {
    stats: {
      totalDownloads: 5,
      totalSkipped: 1,
      uniqueAccounts: 2,
      diskTotal: 1000,
      diskFree: 250,
      version: '1.2.3',
      activeSync: { isActive: false, liveLogs: [] },
    },
    accounts: [
      { username: 'alice', count: 3 },
      { username: 'bob', count: 2 },
    ],
    failStats: false,
    statsCalls: 0,
    accountsCalls: 0,
  };

  class InMemoryEventSource {
    constructor(url) {
      this.url = url;
      this.closed = false;
      this.listeners = new Map();
      this.onopen = null;
      this.onerror = null;
      sseInstances.push(this);
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    open() {
      if (typeof this.onopen === 'function') this.onopen({ type: 'open' });
    }
    pushSync(payload) {
      const raw = JSON.stringify(payload);
      for (const fn of this.listeners.get('sync') || []) fn({ type: 'sync', data: raw });
    }
    fail() {
      if (typeof this.onerror === 'function') this.onerror(new Error('disconnected'));
    }
    close() {
      this.closed = true;
    }
  }

  const fetchImpl = async url => {
    if (url.endsWith('/api/stats')) {
      state.statsCalls++;
      if (state.failStats) throw new Error('offline');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        async json() { return structuredClone(state.stats); },
      };
    }
    if (url.endsWith('/api/accounts')) {
      state.accountsCalls++;
      if (state.failStats) throw new Error('offline');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        async json() { return structuredClone(state.accounts); },
      };
    }
    throw new Error(`Unhandled URL: ${url}`);
  };

  const client = createDaemonClient({ fetchImpl, EventSourceImpl: InMemoryEventSource });
  return { client, daemon: state, sseInstances };
}

test('AppStore connects SSE, falls back to polling on SSE error, and reconnects on 3rd tick', async () => {
  const { client, daemon, sseInstances } = createInMemoryDaemon();
  const timers = createFakeTimers();
  const doc = createMockDocument();

  const store = createAppStore(client, {
    ...timers,
    documentImpl: doc,
  });

  const connEvents = [];
  store.subscribe('connectionChanged', ev => connEvents.push(ev));

  store.startRealtimeSync();
  assert.equal(sseInstances.length, 1);

  // SSE opens -> online
  sseInstances[0].open();
  assert.equal(store.getState().online, true);
  assert.equal(store.getState().sseConnected, true);
  assert.deepEqual(connEvents, [{ online: true, sseConnected: true }]);

  // While SSE is connected, ticks 1..5 do NOT poll; tick 6 polls once
  for (let i = 0; i < 5; i++) await timers.tickIntervals();
  assert.equal(daemon.statsCalls, 0);
  await timers.tickIntervals();
  assert.equal(daemon.statsCalls, 1);

  // SSE errors -> closes source and switches to polling fallback
  sseInstances[0].fail();
  assert.equal(sseInstances[0].closed, true);
  assert.equal(store.getState().sseConnected, false);

  // Next 3 ticks while disconnected: poll every tick, reconnect SSE on tick 9 (9 % 3 === 0)
  await timers.tickIntervals(); // tick 7
  assert.equal(daemon.statsCalls, 2);
  assert.equal(sseInstances.length, 1);

  await timers.tickIntervals(); // tick 8
  assert.equal(daemon.statsCalls, 3);
  assert.equal(sseInstances.length, 1);

  await timers.tickIntervals(); // tick 9 -> reconnect attempt
  assert.equal(daemon.statsCalls, 4);
  assert.equal(sseInstances.length, 2);

  // When document is hidden, polling is skipped
  doc.hidden = true;
  await timers.tickIntervals();
  assert.equal(daemon.statsCalls, 4);

  // Becoming visible triggers refreshStats and reconnects if disconnected
  doc.hidden = false;
  doc.dispatch('visibilitychange');
  await Promise.resolve();
  assert.equal(daemon.statsCalls, 5);

  store.stopRealtimeSync();
  assert.equal(timers.activeIntervals, 0);
  assert.equal(doc.listenerCount('visibilitychange'), 0);
  assert.equal(sseInstances[1].closed, true);
});

test('AppStore deduplicates live logs by shortcode::filename and enforces maxLogs cap', () => {
  const { client } = createInMemoryDaemon();
  const store = createAppStore(client, { maxLogs: 3 });

  store.upsertLiveLog({ shortcode: 'SC1', filename: 'a.jpg', username: 'alice', status: 'downloading', timestamp: 1 });
  store.upsertLiveLog({ shortcode: 'SC1', filename: 'a.jpg', username: 'alice', status: 'completed', size: 2048, timestamp: 2 });

  assert.equal(store.getState().logs.length, 1);
  assert.equal(store.getState().logs[0].status, 'completed');
  assert.equal(store.getState().logs[0].size, 2048);

  store.upsertLiveLog({ shortcode: 'SC2', filename: 'b.jpg', username: 'alice', status: 'completed', timestamp: 3 });
  store.upsertLiveLog({ shortcode: 'SC3', filename: 'c.jpg', username: 'bob', status: 'skipped', timestamp: 4 });
  store.upsertLiveLog({ shortcode: 'SC4', filename: 'd.jpg', username: 'bob', status: 'completed', timestamp: 5 });

  assert.equal(store.getState().logs.length, 3);
  assert.deepEqual(
    store.getState().logs.map(l => l.shortcode),
    ['SC2', 'SC3', 'SC4'],
  );

  let clearedCount = 0;
  store.subscribe('logsUpdated', ({ logs }) => { clearedCount = logs.length; });
  store.clearLogs();
  assert.equal(store.getState().logs.length, 0);
  assert.equal(clearedCount, 0);
});

test('AppStore fans out databaseImported events to subscribers and refreshes stats/accounts', async () => {
  const { client, daemon, sseInstances } = createInMemoryDaemon();
  const timers = createFakeTimers();
  const store = createAppStore(client, { ...timers });

  store.setView('gallery');
  store.connectSSE();
  sseInstances[0].open();

  const received = [];
  store.subscribe('databaseImported', ev => received.push(['downloads-view', ev.activeView]));
  store.subscribe('databaseImported', ev => received.push(['settings-view', ev.activeView]));
  store.subscribe('databaseImported', ev => received.push(['gallery-view', ev.activeView]));

  let accountsUpdatedCount = 0;
  store.subscribe('accountsUpdated', () => { accountsUpdatedCount++; });

  sseInstances[0].pushSync({
    databaseImported: true,
    activeSync: {
      isActive: true,
      username: 'alice',
      liveLogs: [
        { shortcode: 'X1', filename: 'x1.jpg', username: 'alice', status: 'downloading', timestamp: 10 },
      ],
    },
    latest: { shortcode: 'X1', filename: 'x1.jpg', username: 'alice', status: 'completed', size: 512, timestamp: 11 },
  });

  // Allow microtasks from refreshStats({ forceAccounts: true }) to settle
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(received, [
    ['downloads-view', 'gallery'],
    ['settings-view', 'gallery'],
    ['gallery-view', 'gallery'],
  ]);
  assert.equal(daemon.statsCalls, 1);
  assert.equal(accountsUpdatedCount, 1);
  // Deduplicated log merged downloading -> completed
  assert.equal(store.getState().logs.length, 1);
  assert.equal(store.getState().logs[0].status, 'completed');

  // Debounced stats refresh scheduled for terminal latest.status === 'completed'
  assert.equal(timers.activeTimeouts, 1);
  await timers.flushTimeouts();
  assert.equal(daemon.statsCalls, 2);

  store.stopRealtimeSync();
});

test('AppStore emits viewChanged and downloadsCountChanged without DOM probing', async () => {
  const { client, daemon } = createInMemoryDaemon();
  const store = createAppStore(client);

  const views = [];
  store.subscribe('viewChanged', ev => views.push(ev));

  assert.equal(store.setView('invalid-view'), false);
  assert.equal(store.setView('dashboard'), false); // already on dashboard
  assert.equal(store.setView('downloads'), true);
  assert.equal(store.setView('downloads'), false);
  assert.equal(store.setView('downloads', { force: true }), true);

  assert.deepEqual(views, [
    { view: 'downloads', previousView: 'dashboard' },
    { view: 'downloads', previousView: 'downloads' },
  ]);

  const countChanges = [];
  store.subscribe('downloadsCountChanged', ev => countChanges.push(ev));

  await store.refreshStats(); // initial baseline (5)
  assert.equal(countChanges.length, 0);
  assert.deepEqual(store.getState().disk, { total: 1000, free: 250, used: 750, pct: 75 });

  daemon.stats.totalDownloads = 8;
  await store.refreshStats();
  assert.deepEqual(countChanges, [
    { previous: 5, current: 8, activeView: 'downloads' },
  ]);
});

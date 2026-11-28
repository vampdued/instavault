'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_DAEMON_URL,
  normalizeDaemonUrl,
  buildDashboardUrl,
  compareSemver,
  isVersionOutdated,
  createMemoryStorageAdapter,
  createDaemonClient,
} = require('../js/daemon-client.js');

test('URL normalization, default fallback, and dashboard URL builder', () => {
  assert.equal(normalizeDaemonUrl(''), DEFAULT_DAEMON_URL);
  assert.equal(normalizeDaemonUrl(null), DEFAULT_DAEMON_URL);
  assert.equal(normalizeDaemonUrl('http://localhost:19202///'), 'http://localhost:19202');
  assert.equal(normalizeDaemonUrl('  localhost:19202/  '), 'http://localhost:19202');
  assert.equal(normalizeDaemonUrl('https://vault.local:8443/'), 'https://vault.local:8443');

  assert.equal(buildDashboardUrl('http://localhost:19201/', ''), 'http://localhost:19201');
  assert.equal(buildDashboardUrl('http://localhost:19201/', '#settings'), 'http://localhost:19201/#settings');
  assert.equal(buildDashboardUrl('http://localhost:19201', '/#skipped'), 'http://localhost:19201/#skipped');
  assert.equal(buildDashboardUrl('http://localhost:19201', 'settings'), 'http://localhost:19201/#settings');
});

test('semver comparison and min-version check', () => {
  assert.equal(compareSemver('5.0.1', '5.0.1'), 0);
  assert.equal(compareSemver('5.0.0', '5.0.1'), -1);
  assert.equal(compareSemver('5.10.0', '5.2.9'), 1);
  assert.equal(compareSemver('v5.0', '5.0.0'), 0);

  assert.equal(isVersionOutdated('5.0.0', '5.0.1'), true);
  assert.equal(isVersionOutdated('5.0.1', '5.0.1'), false);
  assert.equal(isVersionOutdated('5.2.0', '5.0.1'), false);
  assert.equal(isVersionOutdated('5.0.1', ''), false);
  assert.equal(isVersionOutdated('5.0.1', null), false);
});

test('persists and loads daemon URL through storage seam', async () => {
  const storage = createMemoryStorageAdapter();
  const client = createDaemonClient({ storage });

  assert.equal(await client.getBaseUrl(), DEFAULT_DAEMON_URL);
  assert.equal(await client.setBaseUrl('127.0.0.1:19202///'), 'http://127.0.0.1:19202');
  assert.equal(await client.getBaseUrl(), 'http://127.0.0.1:19202');
  assert.equal(await client.getDashboardUrl('#settings'), 'http://127.0.0.1:19202/#settings');
});

test('enforces bounded timeout via AbortController', async () => {
  let aborted = false;
  const transport = {
    request(_url, options) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('Aborted due to timeout'));
        });
      });
    },
  };

  const client = createDaemonClient({
    storage: createMemoryStorageAdapter(),
    transport,
    defaultTimeoutMs: 25,
  });

  await assert.rejects(
    () => client.requestJson('/api/stats', { timeoutMs: 25 }),
    /Aborted due to timeout/,
  );
  assert.equal(aborted, true);
});

test('batch dispatch reports progress, handles partial errors, and supports mid-batch cancel', async () => {
  const calls = [];
  const transport = {
    async request(url, options) {
      const body = JSON.parse(options.body);
      calls.push({ url, body });
      if (body.shortcode === 'bad_http') {
        return { ok: false, status: 500, text: async () => 'disk full' };
      }
      if (body.shortcode === 'bad_payload') {
        return { ok: true, status: 200, json: async () => ({ status: 'error', error: 'mux failed' }) };
      }
      return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
    },
  };

  const client = createDaemonClient({
    storage: createMemoryStorageAdapter({ serverUrl: 'http://localhost:19201' }),
    transport,
    logger: { error() {} },
  });

  // 1. Partial error handling
  const progressEvents = [];
  const items = [
    { username: 'alice', id: '1', shortcode: 'ok1', url: 'https://cdn/1.jpg', fileExt: 'jpg', takenAt: 100 },
    { username: 'alice', id: '2', shortcode: 'bad_http', url: 'https://cdn/2.jpg', fileExt: 'jpg', takenAt: 200 },
    { username: 'alice', id: '3', shortcode: 'bad_payload', url: 'https://cdn/3.mp4', fileExt: 'mp4', takenAt: 300 },
  ];

  const partialRes = await client.dispatchBatch(items, {
    buildFilename: (it) => `${it.username}/${it.shortcode}`,
    onProgress: (pct) => progressEvents.push(Math.round(pct)),
  });

  assert.equal(partialRes.cancelled, false);
  assert.equal(partialRes.complete, true);
  assert.equal(partialRes.notAllDw, true);
  assert.equal(partialRes.failed, 2);
  assert.equal(partialRes.errors.length, 2);
  // Last 100% progress is suppressed when failed > 0 (matching UI behavior)
  assert.deepEqual(progressEvents, [33, 67]);

  // 2. Mid-batch cancellation
  calls.length = 0;
  let cancelNow = false;
  const cancelRes = await client.dispatchBatch(items, {
    buildFilename: (it) => `${it.username}/${it.shortcode}`,
    isCancelled: () => cancelNow,
    onProgress: () => {
      cancelNow = true;
    },
  });

  assert.equal(cancelRes.cancelled, true);
  assert.equal(cancelRes.complete, false);
  assert.equal(calls.length, 1);
});

test('pollHealth returns online stats+settings and handles offline errors', async () => {
  const onlineTransport = {
    async request(url) {
      if (url.endsWith('/api/stats')) {
        return { ok: true, status: 200, json: async () => ({ totalDownloads: 42, minExtensionVersion: '5.0.0' }) };
      }
      if (url.endsWith('/api/settings')) {
        return { ok: true, status: 200, json: async () => ({ baseDir: '/vault' }) };
      }
      return { ok: false, status: 404, text: async () => 'Not found' };
    },
  };

  const client = createDaemonClient({
    storage: createMemoryStorageAdapter(),
    transport: onlineTransport,
  });

  const health = await client.pollHealth();
  assert.equal(health.online, true);
  assert.equal(health.stats.totalDownloads, 42);
  assert.equal(health.settings.baseDir, '/vault');

  const offlineClient = createDaemonClient({
    storage: createMemoryStorageAdapter(),
    transport: {
      async request() {
        throw new Error('ECONNREFUSED');
      },
    },
  });

  const offlineHealth = await offlineClient.pollHealth();
  assert.equal(offlineHealth.online, false);
  assert.match(offlineHealth.error.message, /ECONNREFUSED/);
});

test('SSE lifecycle with in-memory EventSource adapter', async () => {
  const created = [];
  class FakeEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = new Map();
      this.closed = false;
      created.push(this);
    }
    addEventListener(type, fn) {
      this.listeners.set(type, fn);
    }
    emit(type, payload) {
      if (type === 'open' && this.onopen) this.onopen();
      else if (type === 'error' && this.onerror) this.onerror(payload);
      else if (this.listeners.has(type)) this.listeners.get(type)({ data: JSON.stringify(payload) });
    }
    close() {
      this.closed = true;
    }
  }

  const client = createDaemonClient({
    storage: createMemoryStorageAdapter({ serverUrl: 'http://localhost:19202' }),
    eventSourceFactory: (url) => new FakeEventSource(url),
  });

  const syncPayloads = [];
  let opened = 0;
  let errored = 0;

  await client.connectEvents({
    onOpen: () => opened++,
    onSync: (data) => syncPayloads.push(data),
    onError: () => errored++,
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].url, 'http://localhost:19202/api/events');

  created[0].emit('open');
  assert.equal(opened, 1);
  assert.equal(client.isEventsConnected(), true);

  created[0].emit('sync', { activeSync: { isActive: true, username: 'nasa' } });
  assert.equal(syncPayloads.length, 1);
  assert.equal(syncPayloads[0].activeSync.username, 'nasa');

  // Calling connectEvents while already connected is a no-op
  await client.connectEvents({});
  assert.equal(created.length, 1);

  // Error closes SSE and marks disconnected
  created[0].emit('error', new Error('dropped'));
  assert.equal(errored, 1);
  assert.equal(created[0].closed, true);
  assert.equal(client.isEventsConnected(), false);

  // Reconnect and verify setBaseUrl closes existing SSE
  await client.connectEvents({});
  assert.equal(created.length, 2);
  await client.setBaseUrl('http://localhost:19201');
  assert.equal(created[1].closed, true);
});

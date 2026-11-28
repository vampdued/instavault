import { daemonClient } from './api.js';

export const VIEWS = ['dashboard', 'activity', 'downloads', 'gallery', 'settings'];
export const NAMES = {
  dashboard: 'Overview',
  activity: 'Live activity',
  downloads: 'Downloads',
  gallery: 'Gallery',
  settings: 'Settings',
};

export const TAG = {
  downloading: ['dl', 'SAVING'],
  completed: ['ok', 'SAVED'],
  skipped: ['sk', 'SKIPPED'],
  failed: ['bad', 'ERROR'],
  error: ['bad', 'ERROR'],
};

function computeDisk(stats) {
  if (!stats || !(stats.diskTotal > 0)) return null;
  const total = stats.diskTotal;
  const free = stats.diskFree || 0;
  const used = Math.max(0, total - free);
  const pct = Math.round((used / total) * 100);
  return { total, free, used, pct };
}

export function createAppStore(client, {
  now = () => Date.now(),
  setIntervalImpl = (...args) => globalThis.setInterval(...args),
  clearIntervalImpl = id => globalThis.clearInterval(id),
  setTimeoutImpl = (...args) => globalThis.setTimeout(...args),
  clearTimeoutImpl = id => globalThis.clearTimeout(id),
  documentImpl = typeof document !== 'undefined' ? document : null,
  pollIntervalMs = 1500,
  sseStatsDebounceMs = 150,
  maxLogs = 500,
  initialView = 'dashboard',
} = {}) {
  const state = {
    online: null,
    stats: null,
    disk: null,
    activeSync: null,
    latestEvent: null,
    accounts: [],
    logs: [],
    activeView: VIEWS.includes(initialView) ? initialView : 'dashboard',
    galleryUser: null,
    dashAccQuery: '',
    startedAt: now(),
    sseConnected: false,
    lastTotalDownloads: null,
  };

  let lastAccKey = '';
  let sseSub = null;
  let sseStatsTimer = null;
  let pollTimer = null;
  let pollTick = 0;
  let visibilityHandler = null;

  const listeners = new Map();

  function emit(event, payload) {
    const specific = listeners.get(event);
    if (specific) {
      for (const fn of [...specific]) fn(payload, state);
    }
    const wildcard = listeners.get('*');
    if (wildcard) {
      for (const fn of [...wildcard]) fn({ event, payload, state });
    }
  }

  function subscribe(eventOrListener, maybeListener) {
    const event = typeof eventOrListener === 'function' ? '*' : eventOrListener;
    const fn = typeof eventOrListener === 'function' ? eventOrListener : maybeListener;
    if (typeof fn !== 'function') return () => {};
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => {
      const set = listeners.get(event);
      if (set) {
        set.delete(fn);
        if (set.size === 0) listeners.delete(event);
      }
    };
  }

  function setOnline(ok) {
    if (state.online === ok) return false;
    state.online = ok;
    emit('connectionChanged', { online: ok, sseConnected: state.sseConnected });
    return true;
  }

  function upsertLiveLogInternal(entry) {
    if (!entry) return false;
    const key = `${entry.shortcode || ''}::${entry.filename || ''}`;
    const idx = state.logs.findIndex(x => `${x.shortcode || ''}::${x.filename || ''}` === key);
    if (idx >= 0) {
      state.logs[idx] = { ...state.logs[idx], ...entry };
    } else {
      state.logs.push(entry);
      if (state.logs.length > maxLogs) {
        state.logs = state.logs.slice(-maxLogs);
      }
    }
    return true;
  }

  function upsertLiveLog(entry) {
    if (!upsertLiveLogInternal(entry)) return;
    emit('logsUpdated', { logs: state.logs });
  }

  function clearLogs() {
    state.logs = [];
    emit('logsUpdated', { logs: state.logs });
  }

  function setView(view, { force = false } = {}) {
    if (!VIEWS.includes(view)) return false;
    const previousView = state.activeView;
    if (!force && previousView === view) return false;
    state.activeView = view;
    emit('viewChanged', { view, previousView });
    return true;
  }

  function setGalleryUser(username) {
    const next = username || null;
    if (state.galleryUser === next) return;
    state.galleryUser = next;
    emit('galleryUserChanged', { galleryUser: next });
  }

  function setDashAccQuery(query) {
    state.dashAccQuery = String(query ?? '');
  }

  async function refreshStats({ forceAccounts = false } = {}) {
    try {
      const [stats, accounts] = await Promise.all([
        client.getStats(),
        client.getAccounts(),
      ]);

      setOnline(true);

      const prevTotal = state.lastTotalDownloads;
      state.stats = stats;
      state.disk = computeDisk(stats);
      state.activeSync = stats.activeSync || null;
      state.latestEvent = null;

      if (stats.activeSync && Array.isArray(stats.activeSync.liveLogs)) {
        for (const entry of stats.activeSync.liveLogs) {
          upsertLiveLogInternal(entry);
        }
      }

      const accKey = JSON.stringify(accounts);
      const accountsChanged = forceAccounts || accKey !== lastAccKey;
      if (accountsChanged) {
        lastAccKey = accKey;
        state.accounts = Array.isArray(accounts) ? accounts : [];
      }

      const nextTotal = stats.totalDownloads;
      const downloadsCountChanged = prevTotal !== null && nextTotal !== prevTotal;
      state.lastTotalDownloads = nextTotal;

      emit('statsUpdated', {
        stats: state.stats,
        disk: state.disk,
        activeSync: state.activeSync,
        accounts: state.accounts,
        logs: state.logs,
        online: state.online,
      });

      if (accountsChanged) {
        emit('accountsUpdated', { accounts: state.accounts });
      }

      if (downloadsCountChanged) {
        emit('downloadsCountChanged', {
          previous: prevTotal,
          current: nextTotal,
          activeView: state.activeView,
        });
      }

      return true;
    } catch {
      setOnline(false);
      return false;
    }
  }

  function handleSyncPayload(data) {
    if (!data || typeof data !== 'object') return;

    const activeSync = data.activeSync || null;
    if (activeSync) {
      state.activeSync = activeSync;
      state.latestEvent = data.latest || null;
      if (Array.isArray(activeSync.liveLogs)) {
        for (const entry of activeSync.liveLogs) {
          upsertLiveLogInternal(entry);
        }
      }
      if (data.latest) {
        upsertLiveLogInternal(data.latest);
      }
      emit('logsUpdated', { logs: state.logs });
      emit('syncEvent', {
        activeSync,
        latest: data.latest || null,
        live: Boolean(activeSync.isActive),
        logs: state.logs,
      });
    }

    if (data.databaseImported) {
      lastAccKey = '';
      emit('databaseImported', {
        data,
        activeView: state.activeView,
      });
      refreshStats({ forceAccounts: true });
    }

    if (data.latest && ['completed', 'skipped', 'failed'].includes(data.latest.status)) {
      if (sseStatsTimer !== null) clearTimeoutImpl(sseStatsTimer);
      sseStatsTimer = setTimeoutImpl(() => {
        sseStatsTimer = null;
        refreshStats();
      }, sseStatsDebounceMs);
    }
  }

  function connectSSE() {
    if (sseSub) return sseSub;
    const sub = client.subscribeEvents({
      onOpen() {
        state.sseConnected = true;
        setOnline(true);
      },
      onSync(data) {
        handleSyncPayload(data);
      },
      onError() {
        state.sseConnected = false;
        if (sseSub) {
          const current = sseSub;
          sseSub = null;
          current.close();
        }
      },
    });
    if (sub) {
      sseSub = sub;
    } else {
      state.sseConnected = false;
    }
    return sseSub;
  }

  function startRealtimeSync() {
    if (pollTimer !== null) return;
    connectSSE();

    if (documentImpl && typeof documentImpl.addEventListener === 'function') {
      visibilityHandler = () => {
        if (!documentImpl.hidden) {
          refreshStats();
          if (!state.sseConnected) connectSSE();
        }
      };
      documentImpl.addEventListener('visibilitychange', visibilityHandler);
    }

    pollTick = 0;
    pollTimer = setIntervalImpl(() => {
      if (documentImpl && documentImpl.hidden) return;
      pollTick += 1;
      if (!state.sseConnected) {
        refreshStats();
        if (pollTick % 3 === 0) connectSSE();
      } else if (pollTick % 6 === 0) {
        refreshStats();
      }
    }, pollIntervalMs);
  }

  function stopRealtimeSync() {
    if (pollTimer !== null) {
      clearIntervalImpl(pollTimer);
      pollTimer = null;
    }
    if (sseStatsTimer !== null) {
      clearTimeoutImpl(sseStatsTimer);
      sseStatsTimer = null;
    }
    if (sseSub) {
      const current = sseSub;
      sseSub = null;
      current.close();
    }
    state.sseConnected = false;
    if (visibilityHandler && documentImpl && typeof documentImpl.removeEventListener === 'function') {
      documentImpl.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  }

  return {
    getState: () => state,
    subscribe,
    setOnline,
    upsertLiveLog,
    clearLogs,
    setView,
    setGalleryUser,
    setDashAccQuery,
    refreshStats,
    connectSSE,
    startRealtimeSync,
    stopRealtimeSync,
  };
}

export const appStore = createAppStore(daemonClient);

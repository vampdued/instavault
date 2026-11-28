/**
 * InstaVault Unified Extension Daemon Client
 * Consolidates daemon URL config, bounded-timeout HTTP requests, sync-start signaling,
 * single & batch download dispatch with cancellation & progress callbacks, health/telemetry
 * polling, SSE lifecycle management, and semver version checks behind an explicit
 * transport + storage seam.
 */
(function (root) {
  'use strict';

  const DEFAULT_DAEMON_URL = 'http://localhost:19201';
  const DEFAULT_TIMEOUT_MS = 2500;
  const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30000;
  const STORAGE_KEY_SERVER_URL = 'serverUrl';

  function normalizeDaemonUrl(rawUrl, fallback = DEFAULT_DAEMON_URL) {
    if (typeof rawUrl !== 'string') return fallback;
    const trimmed = rawUrl.trim();
    if (!trimmed) return fallback;
    let clean = trimmed.replace(/\/+$/, '');
    if (!clean) return fallback;
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    return clean;
  }

  function buildDashboardUrl(baseUrl, hashPath = '') {
    const cleanBase = normalizeDaemonUrl(baseUrl, DEFAULT_DAEMON_URL);
    if (!hashPath) return cleanBase;
    const cleanedHash = String(hashPath).replace(/^\/?#?/, '');
    return cleanedHash ? `${cleanBase}/#${cleanedHash}` : cleanBase;
  }

  function parseSemverParts(version) {
    return String(version || '')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((part) => parseInt(part, 10) || 0);
  }

  function compareSemver(a, b) {
    const pa = parseSemverParts(a);
    const pb = parseSemverParts(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const av = pa[i] || 0;
      const bv = pb[i] || 0;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  }

  function isVersionOutdated(currentVersion, minRequiredVersion) {
    if (!minRequiredVersion) return false;
    return compareSemver(currentVersion, minRequiredVersion) < 0;
  }

  function createMemoryStorageAdapter(initial = {}) {
    const store = Object.assign({}, initial);
    return {
      async get(key, defaultValue) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue;
      },
      async set(key, value) {
        store[key] = value;
      },
    };
  }

  function createBrowserStorageAdapter() {
    const fallback = createMemoryStorageAdapter();
    return {
      get(key, defaultValue) {
        return new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
              chrome.storage.local.get({ [key]: defaultValue }, (cfg) => {
                if (chrome.runtime && chrome.runtime.lastError) {
                  fallback.get(key, defaultValue).then(resolve);
                  return;
                }
                resolve(cfg && cfg[key] !== undefined ? cfg[key] : defaultValue);
              });
              return;
            } catch (_) {
              // Fall through to memory fallback
            }
          }
          fallback.get(key, defaultValue).then(resolve);
        });
      },
      set(key, value) {
        return new Promise((resolve) => {
          fallback.set(key, value);
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
              chrome.storage.local.set({ [key]: value }, () => resolve());
              return;
            } catch (_) {
              // Fall through
            }
          }
          resolve();
        });
      },
    };
  }

  function createBrowserTransportAdapter(fetchImpl) {
    const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    return {
      async request(url, options = {}) {
        if (!doFetch) {
          throw new Error('No fetch implementation available');
        }
        return doFetch(url, options);
      },
    };
  }

  function buildDownloadPayload(item, buildFilename) {
    return {
      username: item.username || item.userName || 'instagram',
      accountId: item.id ? String(item.id) : '',
      shortcode: item.shortcode || item.id || '',
      url: item.url,
      dashVideoUrl: item.dashVideoUrl || '',
      dashAudioUrl: item.dashAudioUrl || '',
      filename: typeof buildFilename === 'function' ? buildFilename(item) : item.filename || '',
      fileExt: item.fileExt,
      takenAt: parseInt(item.takenAt, 10) || 0,
      isThumb: Boolean(item.isThumb),
      pageType: item.pt || item.pageType || '',
      index: item.index || 0,
    };
  }

  function createDaemonClient(options = {}) {
    const defaultUrl = normalizeDaemonUrl(options.defaultUrl, DEFAULT_DAEMON_URL);
    const defaultTimeoutMs =
      typeof options.defaultTimeoutMs === 'number' ? options.defaultTimeoutMs : DEFAULT_TIMEOUT_MS;
    const downloadTimeoutMs =
      typeof options.downloadTimeoutMs === 'number'
        ? options.downloadTimeoutMs
        : DEFAULT_DOWNLOAD_TIMEOUT_MS;
    const storage = options.storage || createBrowserStorageAdapter();
    const transport = options.transport || createBrowserTransportAdapter(options.fetch);
    const eventSourceFactory =
      options.eventSourceFactory ||
      ((url) => (typeof EventSource !== 'undefined' ? new EventSource(url) : null));
    const runtimeDownload = typeof options.runtimeDownload === 'function' ? options.runtimeDownload : null;
    const runtimeSyncStart = typeof options.runtimeSyncStart === 'function' ? options.runtimeSyncStart : null;
    const logger = options.logger || console;

    let cachedBaseUrl = null;
    let eventSource = null;
    let sseConnected = false;

    async function getBaseUrl() {
      const stored = await storage.get(STORAGE_KEY_SERVER_URL, defaultUrl);
      cachedBaseUrl = normalizeDaemonUrl(stored, defaultUrl);
      return cachedBaseUrl;
    }

    async function setBaseUrl(rawUrl) {
      const clean = normalizeDaemonUrl(rawUrl, defaultUrl);
      cachedBaseUrl = clean;
      closeEvents();
      await storage.set(STORAGE_KEY_SERVER_URL, clean);
      return clean;
    }

    function getCachedBaseUrl() {
      return cachedBaseUrl || defaultUrl;
    }

    async function getDashboardUrl(hashPath = '') {
      const base = await getBaseUrl();
      return buildDashboardUrl(base, hashPath);
    }

    async function fetchWithTimeout(url, fetchOpts = {}) {
      const timeoutMs =
        typeof fetchOpts.timeoutMs === 'number' ? fetchOpts.timeoutMs : defaultTimeoutMs;
      const reqOpts = Object.assign({}, fetchOpts);
      delete reqOpts.timeoutMs;

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timer = null;
      if (controller && timeoutMs > 0) {
        reqOpts.signal = controller.signal;
        timer = setTimeout(() => {
          try {
            controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
          } catch (_) {
            controller.abort();
          }
        }, timeoutMs);
      }

      try {
        return await transport.request(url, reqOpts);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async function requestJson(path, reqOptions = {}) {
      const base = await getBaseUrl();
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const method = reqOptions.method || 'GET';
      const headers = Object.assign({}, reqOptions.headers || {});
      let body = reqOptions.body;
      if (body !== undefined && typeof body !== 'string') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(body);
      }

      const res = await fetchWithTimeout(url, {
        method,
        headers,
        body,
        timeoutMs: reqOptions.timeoutMs,
      });

      if (!res.ok) {
        let errText = '';
        try {
          errText = typeof res.text === 'function' ? await res.text() : '';
        } catch (_) {}
        return {
          ok: false,
          status: res.status || 0,
          data: null,
          error: errText || `HTTP ${res.status}`,
        };
      }

      let data = null;
      try {
        data = typeof res.json === 'function' ? await res.json() : null;
      } catch (_) {}

      return { ok: true, status: res.status || 200, data, error: null };
    }

    async function notifySyncStart(payload = {}) {
      if (runtimeSyncStart) {
        return runtimeSyncStart(payload);
      }
      try {
        return await requestJson('/api/sync/start', {
          method: 'POST',
          body: payload,
          timeoutMs: defaultTimeoutMs,
        });
      } catch (err) {
        return { ok: false, status: 0, data: null, error: (err && err.message) || 'sync_start failed' };
      }
    }

    async function dispatchDownload(payload, opts = {}) {
      if (runtimeDownload) {
        return runtimeDownload(payload, opts);
      }
      try {
        const res = await requestJson('/api/download', {
          method: 'POST',
          body: payload,
          timeoutMs: typeof opts.timeoutMs === 'number' ? opts.timeoutMs : downloadTimeoutMs,
        });
        return res;
      } catch (err) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: (err && err.message) || 'Download request failed',
        };
      }
    }

    async function dispatchBatch(items, callbacks = {}) {
      const list = Array.isArray(items) ? items : [];
      const { buildFilename, isCancelled, onProgress, onItemError } = callbacks;
      const total = list.length;
      let current = 0;
      let failed = 0;
      const errors = [];

      for (const item of list) {
        if (typeof isCancelled === 'function' && isCancelled()) {
          return {
            cancelled: true,
            complete: false,
            notAllDw: failed > 0,
            total,
            completed: current,
            failed,
            errors,
          };
        }

        const payload = buildDownloadPayload(item, buildFilename);
        try {
          const res = await dispatchDownload(payload);
          if (!res || !res.ok || (res.data && res.data.status === 'error')) {
            failed++;
            const errMsg =
              (res && (res.error || (res.data && res.data.error))) || 'Download failed';
            errors.push({ item, error: errMsg });
            if (typeof onItemError === 'function') onItemError(new Error(errMsg), item);
          }
        } catch (err) {
          failed++;
          errors.push({ item, error: (err && err.message) || String(err) });
          if (typeof onItemError === 'function') {
            onItemError(err, item);
          } else if (logger && typeof logger.error === 'function') {
            logger.error('[InstaVault] Download failed:', err);
          }
        }

        current++;
        if (typeof onProgress === 'function' && (failed === 0 || current < total)) {
          onProgress((current / total) * 100, { current, total, failed });
        }
      }

      return {
        cancelled: false,
        complete: true,
        notAllDw: failed > 0,
        total,
        completed: current,
        failed,
        errors,
      };
    }

    async function pollHealth(opts = {}) {
      const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : defaultTimeoutMs;
      try {
        const [statsRes, settingsRes] = await Promise.all([
          requestJson('/api/stats', { timeoutMs }),
          requestJson('/api/settings', { timeoutMs }).catch(() => null),
        ]);

        if (!statsRes.ok) {
          return {
            online: false,
            stats: null,
            settings: null,
            error: new Error(statsRes.error || `HTTP error ${statsRes.status}`),
          };
        }

        return {
          online: true,
          stats: statsRes.data,
          settings: settingsRes && settingsRes.ok ? settingsRes.data : null,
          error: null,
        };
      } catch (err) {
        return { online: false, stats: null, settings: null, error: err };
      }
    }

    function closeEvents() {
      if (eventSource) {
        try {
          eventSource.close();
        } catch (_) {}
        eventSource = null;
      }
      sseConnected = false;
    }

    async function connectEvents(handlers = {}) {
      if (eventSource) return eventSource;
      const base = cachedBaseUrl || (await getBaseUrl());
      const url = `${base}/api/events`;
      try {
        const es = eventSourceFactory(url);
        if (!es) return null;
        eventSource = es;
        es.onopen = () => {
          sseConnected = true;
          if (typeof handlers.onOpen === 'function') handlers.onOpen();
        };
        if (typeof es.addEventListener === 'function') {
          es.addEventListener('sync', (ev) => {
            try {
              const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
              if (typeof handlers.onSync === 'function') handlers.onSync(data);
            } catch (_) {}
          });
        }
        es.onerror = (err) => {
          closeEvents();
          if (typeof handlers.onError === 'function') handlers.onError(err);
        };
        return es;
      } catch (err) {
        closeEvents();
        if (typeof handlers.onError === 'function') handlers.onError(err);
        return null;
      }
    }

    function isEventsConnected() {
      return sseConnected;
    }

    return {
      getBaseUrl,
      setBaseUrl,
      getCachedBaseUrl,
      getDashboardUrl,
      buildDashboardUrl: (hashPath = '') => buildDashboardUrl(getCachedBaseUrl(), hashPath),
      fetchWithTimeout,
      requestJson,
      notifySyncStart,
      dispatchDownload,
      dispatchBatch,
      pollHealth,
      connectEvents,
      closeEvents,
      isEventsConnected,
      compareSemver,
      isVersionOutdated,
    };
  }

  const api = {
    DEFAULT_DAEMON_URL,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_DOWNLOAD_TIMEOUT_MS,
    normalizeDaemonUrl,
    buildDashboardUrl,
    compareSemver,
    isVersionOutdated,
    createMemoryStorageAdapter,
    createBrowserStorageAdapter,
    createBrowserTransportAdapter,
    buildDownloadPayload,
    createDaemonClient,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultDaemonClient = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

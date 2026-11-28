export class DaemonApiError extends Error {
  constructor(message, { status = 0, code = 'DAEMON_ERROR', path = '', details = null, cause = undefined } = {}) {
    super(message);
    this.name = 'DaemonApiError';
    this.status = status;
    this.code = code;
    this.path = path;
    this.details = details;
    if (cause !== undefined) this.cause = cause;
  }
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  return String(baseUrl).replace(/\/+$/, '');
}

function parseFilenameFromDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const quoted = headerValue.match(/filename="([^"]+)"/i);
  if (quoted && quoted[1]) return quoted[1];
  const bare = headerValue.match(/filename=([^;\s]+)/i);
  if (bare && bare[1]) return bare[1].replace(/^["']|["']$/g, '');
  return fallback;
}

async function readErrorPayload(response) {
  const contentType = response.headers?.get?.('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  if (typeof response.json === 'function') {
    try {
      return await response.json();
    } catch {
      // Fall through to text if available
    }
  }
  if (typeof response.text === 'function') {
    try {
      const text = await response.text();
      return text ? { error: text } : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function createDaemonClient({
  fetchImpl,
  EventSourceImpl,
  baseUrl = '',
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  const urlFor = path => `${base}${path}`;

  const getFetch = () => {
    const fn = fetchImpl || globalThis.fetch;
    if (typeof fn !== 'function') {
      throw new DaemonApiError('Fetch implementation is not available', {
        status: 0,
        code: 'NO_FETCH',
      });
    }
    return fn;
  };

  async function requestRaw(path, options = {}) {
    const fn = getFetch();
    let response;
    try {
      response = await fn(urlFor(path), options);
    } catch (err) {
      throw new DaemonApiError(err?.message || 'Could not reach InstaVault daemon', {
        status: 0,
        code: 'NETWORK_ERROR',
        path,
        cause: err,
      });
    }

    if (!response.ok) {
      const payload = await readErrorPayload(response);
      const message =
        (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
        `Request failed (${response.status})`;
      const code =
        (payload && typeof payload === 'object' && payload.code) ||
        `HTTP_${response.status}`;
      throw new DaemonApiError(String(message), {
        status: response.status,
        code,
        path,
        details: payload,
      });
    }

    return response;
  }

  async function requestJSON(path, options = {}) {
    const response = await requestRaw(path, options);
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch (err) {
      throw new DaemonApiError('Invalid JSON response from daemon', {
        status: response.status,
        code: 'INVALID_JSON',
        path,
        cause: err,
      });
    }
  }

  return {
    baseUrl: base,

    mediaUrl(item) {
      const rel = (item && item.relativePath ? String(item.relativePath) : '').replace(/\\/g, '/');
      return urlFor(`/api/media/${rel}`);
    },

    thumbUrl(item) {
      const raw = typeof item === 'string' ? item : item && item.relativePath ? item.relativePath : '';
      const rel = String(raw).replace(/\\/g, '/');
      return urlFor(`/api/thumb/${rel}`);
    },

    /* Stats & Accounts */
    getStats() {
      return requestJSON('/api/stats');
    },

    getAccounts() {
      return requestJSON('/api/accounts');
    },

    /* Downloads */
    listDownloads({ page = 1, limit = 100 } = {}) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      return requestJSON(`/api/downloads?${params.toString()}`);
    },

    async deleteDownload(id) {
      await requestRaw(`/api/downloads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return { ok: true, id };
    },

    async clearDownloads() {
      await requestRaw('/api/downloads', { method: 'DELETE' });
      return { ok: true };
    },

    forceDownload(payload) {
      return requestJSON('/api/force-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    retryDownload(payload) {
      return this.forceDownload(payload);
    },

    /* Skipped */
    listSkipped({ limit = 100 } = {}) {
      const params = new URLSearchParams({ limit: String(limit) });
      return requestJSON(`/api/skipped?${params.toString()}`);
    },

    async deleteSkipped(id) {
      await requestRaw(`/api/skipped/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return { ok: true, id };
    },

    async clearSkipped() {
      await requestRaw('/api/skipped', { method: 'DELETE' });
      return { ok: true };
    },

    /* Settings */
    getSettings() {
      return requestJSON('/api/settings');
    },

    async saveSettings({ baseDir, folderStructure }) {
      await requestRaw('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseDir, folderStructure }),
      });
      return { ok: true };
    },

    verifyDir(path) {
      return requestJSON('/api/settings/verify-dir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    },

    /* Vault Backup (Export / Import) */
    async exportDatabase() {
      const response = await requestRaw('/api/database/export');
      const blob = await response.blob();
      const disposition = response.headers?.get?.('Content-Disposition') || '';
      const fallback = `instavault-backup-${new Date().toISOString().slice(0, 10)}.db`;
      const filename = parseFilenameFromDisposition(disposition, fallback);
      return { blob, filename };
    },

    importDatabase({ file, mode = 'replace', overwriteBaseDir = false }) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      if (mode === 'replace' && overwriteBaseDir) {
        formData.append('overwriteBaseDir', 'true');
      }
      return requestJSON('/api/database/import', {
        method: 'POST',
        body: formData,
      });
    },

    /* Version & Update Check */
    getVersion() {
      return requestJSON('/api/version');
    },

    checkUpdate() {
      return requestJSON('/api/check-update');
    },

    /* Server-Sent Events */
    subscribeEvents({ onOpen, onSync, onError } = {}) {
      const ES = EventSourceImpl || globalThis.EventSource;
      if (typeof ES !== 'function') return null;

      let source;
      try {
        source = new ES(urlFor('/api/events'));
      } catch (err) {
        if (typeof onError === 'function') onError(err);
        return null;
      }

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          source.close();
        } catch {}
      };

      source.onopen = event => {
        if (!closed && typeof onOpen === 'function') onOpen(event);
      };

      source.addEventListener('sync', event => {
        if (closed || typeof onSync !== 'function') return;
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          onSync(data);
        } catch {
          // Ignore malformed SSE payloads
        }
      });

      source.onerror = event => {
        if (!closed && typeof onError === 'function') onError(event);
      };

      return { close, eventSource: source };
    },
  };
}

export const daemonClient = createDaemonClient();

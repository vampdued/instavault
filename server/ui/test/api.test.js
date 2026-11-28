import test from 'node:test';
import assert from 'node:assert/strict';
import { createDaemonClient, DaemonApiError } from '../js/api.js';

function createMockFetch(routes = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const method = (options.method || 'GET').toUpperCase();
    const key = `${method} ${url}`;
    const handler = routes[key] || routes[url];
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }
    return handler(url, options);
  };
  return { fetchImpl, calls };
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  const headerMap = new Map(
    Object.entries({ 'Content-Type': 'application/json', ...headers }).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headerMap.get(String(name).toLowerCase()) ?? null },
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}

function createMockEventSourceClass() {
  const instances = [];
  class MockEventSource {
    constructor(url) {
      this.url = url;
      this.closed = false;
      this.listeners = new Map();
      this.onopen = null;
      this.onerror = null;
      instances.push(this);
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    emitOpen() {
      if (typeof this.onopen === 'function') this.onopen({ type: 'open' });
    }
    emit(type, data) {
      const fns = this.listeners.get(type) || [];
      for (const fn of fns) fn({ type, data });
    }
    emitError(err = new Error('sse error')) {
      if (typeof this.onerror === 'function') this.onerror(err);
    }
    close() {
      this.closed = true;
    }
  }
  return { MockEventSource, instances };
}

test('DaemonClient sends expected paths, methods, and payloads for core endpoints', async () => {
  const { fetchImpl, calls } = createMockFetch({
    'GET http://localhost:19201/api/stats': () => jsonResponse({ totalDownloads: 12, totalSkipped: 3 }),
    'GET http://localhost:19201/api/accounts': () => jsonResponse([{ username: 'alice', count: 12 }]),
    'GET http://localhost:19201/api/downloads?page=2&limit=50': () => jsonResponse([{ id: 7 }]),
    'DELETE http://localhost:19201/api/downloads/42': () => jsonResponse({ ok: true }),
    'DELETE http://localhost:19201/api/downloads': () => jsonResponse({ ok: true }),
    'POST http://localhost:19201/api/force-download': () => jsonResponse({ queued: true }),
    'GET http://localhost:19201/api/skipped?limit=25': () => jsonResponse([{ id: 9 }]),
    'DELETE http://localhost:19201/api/skipped/9': () => jsonResponse({ ok: true }),
    'DELETE http://localhost:19201/api/skipped': () => jsonResponse({ ok: true }),
    'GET http://localhost:19201/api/settings': () => jsonResponse({ baseDir: '/vault', folderStructure: 'profile' }),
    'POST http://localhost:19201/api/settings': () => jsonResponse({ ok: true }),
    'POST http://localhost:19201/api/settings/verify-dir': () => jsonResponse({ valid: true, message: 'Writable' }),
    'GET http://localhost:19201/api/version': () => jsonResponse({ version: '2.4.0' }),
    'GET http://localhost:19201/api/check-update': () => jsonResponse({ updateAvailable: false }),
  });

  const client = createDaemonClient({ fetchImpl, baseUrl: 'http://localhost:19201/' });

  assert.deepEqual(await client.getStats(), { totalDownloads: 12, totalSkipped: 3 });
  assert.deepEqual(await client.getAccounts(), [{ username: 'alice', count: 12 }]);
  assert.deepEqual(await client.listDownloads({ page: 2, limit: 50 }), [{ id: 7 }]);
  assert.deepEqual(await client.deleteDownload(42), { ok: true, id: 42 });
  assert.deepEqual(await client.clearDownloads(), { ok: true });
  assert.deepEqual(await client.forceDownload({ shortcode: 'ABC' }), { queued: true });
  assert.deepEqual(await client.retryDownload({ shortcode: 'DEF' }), { queued: true });
  assert.deepEqual(await client.listSkipped({ limit: 25 }), [{ id: 9 }]);
  assert.deepEqual(await client.deleteSkipped(9), { ok: true, id: 9 });
  assert.deepEqual(await client.clearSkipped(), { ok: true });
  assert.deepEqual(await client.getSettings(), { baseDir: '/vault', folderStructure: 'profile' });
  assert.deepEqual(await client.saveSettings({ baseDir: '/new', folderStructure: 'flat' }), { ok: true });
  assert.deepEqual(await client.verifyDir('/new'), { valid: true, message: 'Writable' });
  assert.deepEqual(await client.getVersion(), { version: '2.4.0' });
  assert.deepEqual(await client.checkUpdate(), { updateAvailable: false });

  assert.equal(
    client.mediaUrl({ relativePath: 'alice\\photo_1.jpg' }),
    'http://localhost:19201/api/media/alice/photo_1.jpg',
  );
  assert.equal(
    client.thumbUrl({ relativePath: 'alice\\clip_1.mp4' }),
    'http://localhost:19201/api/thumb/alice/clip_1.mp4',
  );
  assert.equal(
    client.thumbUrl('alice\\clip_2.mp4'),
    'http://localhost:19201/api/thumb/alice/clip_2.mp4',
  );

  const saveCall = calls.find(c => c.url.endsWith('/api/settings') && c.options.method === 'POST');
  assert.equal(saveCall.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(saveCall.options.body), { baseDir: '/new', folderStructure: 'flat' });

  const verifyCall = calls.find(c => c.url.endsWith('/api/settings/verify-dir'));
  assert.deepEqual(JSON.parse(verifyCall.options.body), { path: '/new' });
});

test('DaemonClient normalizes HTTP JSON, plain text, invalid JSON, and network errors into DaemonApiError', async () => {
  const { fetchImpl } = createMockFetch({
    'GET /api/stats': () => jsonResponse({ error: 'Database locked', code: 'DB_LOCKED' }, { status: 503 }),
    'GET /api/accounts': () => ({
      ok: false,
      status: 500,
      headers: { get: () => 'text/plain' },
      async text() { return 'Internal failure'; },
    }),
    'GET /api/version': () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      async json() { throw new SyntaxError('Unexpected token'); },
    }),
    'GET /api/settings': async () => { throw new TypeError('fetch failed'); },
  });

  const client = createDaemonClient({ fetchImpl });

  await assert.rejects(
    () => client.getStats(),
    err => {
      assert.ok(err instanceof DaemonApiError);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'DB_LOCKED');
      assert.equal(err.path, '/api/stats');
      assert.equal(err.message, 'Database locked');
      assert.deepEqual(err.details, { error: 'Database locked', code: 'DB_LOCKED' });
      return true;
    },
  );

  await assert.rejects(
    () => client.getAccounts(),
    err => {
      assert.ok(err instanceof DaemonApiError);
      assert.equal(err.status, 500);
      assert.equal(err.code, 'HTTP_500');
      assert.equal(err.message, 'Internal failure');
      return true;
    },
  );

  await assert.rejects(
    () => client.getVersion(),
    err => {
      assert.ok(err instanceof DaemonApiError);
      assert.equal(err.status, 200);
      assert.equal(err.code, 'INVALID_JSON');
      return true;
    },
  );

  await assert.rejects(
    () => client.getSettings(),
    err => {
      assert.ok(err instanceof DaemonApiError);
      assert.equal(err.status, 0);
      assert.equal(err.code, 'NETWORK_ERROR');
      assert.equal(err.path, '/api/settings');
      return true;
    },
  );
});

test('DaemonClient handles Vault Backup export and import calls', async () => {
  const fakeBlob = new Blob(['SQLite format 3\0'], { type: 'application/octet-stream' });
  const receivedForms = [];

  const { fetchImpl } = createMockFetch({
    'GET /api/database/export': () => ({
      ok: true,
      status: 200,
      headers: {
        get: name => (name.toLowerCase() === 'content-disposition' ? 'attachment; filename="instavault-2026-11-28.db"' : null),
      },
      async blob() { return fakeBlob; },
    }),
    'POST /api/database/import': (_url, options) => {
      receivedForms.push(options.body);
      return jsonResponse({
        mode: options.body.get('mode'),
        downloadsAdded: 10,
        skippedAdded: 2,
        totalDownloads: 10,
        totalSkipped: 2,
        pathsRebased: 4,
        safetySnapshot: 'instavault-safety.bak',
      });
    },
  });

  const client = createDaemonClient({ fetchImpl });

  const exported = await client.exportDatabase();
  assert.equal(exported.filename, 'instavault-2026-11-28.db');
  assert.equal(exported.blob, fakeBlob);

  const backupFile = new Blob(['sqlite-bytes'], { type: 'application/octet-stream' });
  const replaceResult = await client.importDatabase({
    file: backupFile,
    mode: 'replace',
    overwriteBaseDir: true,
  });
  assert.equal(replaceResult.mode, 'replace');
  assert.equal(replaceResult.downloadsAdded, 10);
  assert.equal(receivedForms[0].get('mode'), 'replace');
  assert.equal(receivedForms[0].get('overwriteBaseDir'), 'true');

  const mergeResult = await client.importDatabase({
    file: backupFile,
    mode: 'merge',
    overwriteBaseDir: true,
  });
  assert.equal(mergeResult.mode, 'merge');
  assert.equal(receivedForms[1].get('mode'), 'merge');
  assert.equal(receivedForms[1].get('overwriteBaseDir'), null);
});

test('DaemonClient subscribes to SSE events and cleans up on close', () => {
  const { MockEventSource, instances } = createMockEventSourceClass();
  const client = createDaemonClient({
    EventSourceImpl: MockEventSource,
    baseUrl: 'http://127.0.0.1:19201',
  });

  const events = [];
  const sub = client.subscribeEvents({
    onOpen: () => events.push('open'),
    onSync: data => events.push(['sync', data]),
    onError: () => events.push('error'),
  });

  assert.equal(instances.length, 1);
  assert.equal(instances[0].url, 'http://127.0.0.1:19201/api/events');

  instances[0].emitOpen();
  instances[0].emit('sync', JSON.stringify({ activeSync: { isActive: true } }));
  instances[0].emit('sync', '{malformed json');
  instances[0].emitError();

  assert.deepEqual(events, [
    'open',
    ['sync', { activeSync: { isActive: true } }],
    'error',
  ]);

  sub.close();
  assert.equal(instances[0].closed, true);

  // Events after close are ignored
  instances[0].emit('sync', JSON.stringify({ activeSync: { isActive: false } }));
  assert.equal(events.length, 3);
});

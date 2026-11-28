'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STORAGE_KEYS,
  parseHarvestedHeaders,
  parseGraphqlQueryRequest,
  classifyQueryHashUpdate,
  parseGraphqlFormBody,
  createRequestHarvester,
} = require('../js/instagram-request-harvester.js');

function createAsyncMemoryStorage(initial = {}, delayMs = 0) {
  const store = Object.assign({}, initial);
  let setCalls = 0;
  return {
    store,
    get setCalls() {
      return setCalls;
    },
    async get(key) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return { [key]: store[key] ? Object.assign({}, store[key]) : undefined };
    },
    async set(items) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      setCalls++;
      for (const [k, v] of Object.entries(items)) {
        store[k] = Object.assign({}, v);
      }
    },
  };
}

test('parseHarvestedHeaders extracts only tracked Instagram headers case-insensitively', () => {
  const parsed = parseHarvestedHeaders([
    { name: 'X-IG-App-ID', value: '936619743392459' },
    { name: 'X-ASBD-ID', value: '129477' },
    { name: 'x-ig-www-claim', value: 'hmac.AR123' },
    { name: 'User-Agent', value: 'Mozilla/5.0' },
  ]);

  assert.deepEqual(parsed, {
    'x-ig-app-id': '936619743392459',
    'x-asbd-id': '129477',
    'x-ig-www-claim': 'hmac.AR123',
  });

  assert.equal(parseHarvestedHeaders([{ name: 'Accept', value: '*/*' }]), null);
  assert.equal(parseHarvestedHeaders([]), null);
  assert.equal(parseHarvestedHeaders(null), null);
});

test('parseGraphqlQueryRequest extracts doc_id, query_hash, and highlights query_id safely', () => {
  const vars = encodeURIComponent(
    JSON.stringify({
      child_comment_count: 3,
      shortcode: 'C9abc',
      fb_api_req_friendly_name: 'PolarisPostQuery',
    }),
  );
  const res = parseGraphqlQueryRequest({
    url: `https://www.instagram.com/graphql/query/?query_hash=hash123&doc_id=987654&variables=${vars}`,
    initiator: 'https://www.instagram.com',
  });

  assert.equal(res.queryHash, 'hash123');
  assert.deepEqual(res.docIdUpdate, { friendlyName: 'PolarisPostQuery', docId: '987654' });
  assert.equal(res.needsTabUrl, true);
  assert.equal(res.highlightsListId, null);

  // Ignores non-Instagram initiator
  assert.equal(
    parseGraphqlQueryRequest({
      url: 'https://www.instagram.com/graphql/query/?query_hash=abc',
      initiator: 'https://example.com',
    }),
    null,
  );

  // Extracts highlights query_id when query_hash is absent
  const hlRes = parseGraphqlQueryRequest({
    url: 'https://www.instagram.com/graphql/query/?query_id=178451234&user_id=99&include_chaining=false&include_reel=true&include_highlight_reels=true',
    initiator: 'https://www.instagram.com',
  });
  assert.equal(hlRes.queryHash, null);
  assert.equal(hlRes.highlightsListId, '178451234');
});

test('parseGraphqlQueryRequest survives malformed variables JSON without throwing', () => {
  const res = parseGraphqlQueryRequest({
    url: 'https://www.instagram.com/graphql/query/?variables=%7Bnot-valid-json&query_hash=qh_999&doc_id=555&fb_api_req_friendly_name=BrokenVarsQuery',
    initiator: 'https://www.instagram.com',
  });

  assert.ok(res);
  assert.equal(res.queryHash, 'qh_999');
  assert.deepEqual(res.docIdUpdate, { friendlyName: 'BrokenVarsQuery', docId: '555' });
});

test('classifyQueryHashUpdate maps variables + tab URL to exact instaQueryHash slots', () => {
  assert.deepEqual(
    classifyQueryHashUpdate({ child_comment_count: 3, shortcode: 'abc' }, 'h1', 'https://www.instagram.com/p/abc/'),
    { key: 'forSinglePost', value: 'h1' },
  );

  assert.deepEqual(
    classifyQueryHashUpdate(
      { user_id: '1', include_chaining: true, include_reel: true, include_highlight_reels: true },
      'h2',
      'https://www.instagram.com/natgeo/',
    ),
    { key: 'forHighlightsList', value: 'h2' },
  );

  assert.deepEqual(
    classifyQueryHashUpdate({ id: '1', first: 12 }, 'h3', 'https://www.instagram.com/alice/saved/'),
    { key: 'forUserSavedPosts', value: 'h3' },
  );
  assert.deepEqual(
    classifyQueryHashUpdate({ id: '1', first: 12 }, 'h4', 'https://www.instagram.com/alice/tagged/'),
    { key: 'forUserTagPosts', value: 'h4' },
  );
  assert.deepEqual(
    classifyQueryHashUpdate({ id: '1', first: 12 }, 'h5', 'https://www.instagram.com/alice/'),
    { key: 'forUserAllPosts', value: 'h5' },
  );
  assert.equal(
    classifyQueryHashUpdate({ id: '1', first: 12 }, 'h6', 'https://www.instagram.com/alice/guides/'),
    null,
  );
  assert.equal(
    classifyQueryHashUpdate({ id: '1', first: 12 }, 'h7', 'https://www.instagram.com/explore/'),
    null,
  );
});

test('parseGraphqlFormBody extracts doc_id and fb_api_req_friendly_name from POST formData', () => {
  const parsed = parseGraphqlFormBody({
    requestBody: {
      formData: {
        doc_id: ['25317500907894419'],
        fb_api_req_friendly_name: ['PolarisStoriesV3ReelPageGalleryQuery'],
      },
    },
  });

  assert.deepEqual(parsed, {
    friendlyName: 'PolarisStoriesV3ReelPageGalleryQuery',
    docId: '25317500907894419',
  });

  assert.equal(parseGraphqlFormBody({ requestBody: { formData: { doc_id: ['123'] } } }), null);
  assert.equal(parseGraphqlFormBody({}), null);
});

test('serialized instaDocIds writes preserve all concurrent updates without lost writes', async () => {
  const storage = createAsyncMemoryStorage({}, 5);
  const harvester = createRequestHarvester({
    storage,
    tabs: { async get() { return null; } },
  });

  // Fire 5 concurrent POST doc_id events simultaneously against slow async storage
  const names = [
    ['QueryA', '1001'],
    ['QueryB', '1002'],
    ['QueryC', '1003'],
    ['QueryD', '1004'],
    ['QueryE', '1005'],
  ];
  for (const [friendlyName, docId] of names) {
    harvester.handleGraphqlBeforeRequest({
      requestBody: {
        formData: {
          doc_id: [docId],
          fb_api_req_friendly_name: [friendlyName],
        },
      },
    });
  }

  await harvester.flush();

  assert.deepEqual(storage.store[STORAGE_KEYS.DOC_IDS], {
    QueryA: '1001',
    QueryB: '1002',
    QueryC: '1003',
    QueryD: '1004',
    QueryE: '1005',
  });
});

test('guards negative tabId and skips tabs.get for non-tab background requests', async () => {
  const storage = createAsyncMemoryStorage();
  let tabGetCalled = false;
  const harvester = createRequestHarvester({
    storage,
    tabs: {
      async get() {
        tabGetCalled = true;
        return { url: 'https://www.instagram.com/alice/' };
      },
    },
  });

  const vars = encodeURIComponent(JSON.stringify({ id: '1', first: 12 }));
  harvester.handleGraphqlBeforeSendHeaders({
    tabId: -1,
    initiator: 'https://www.instagram.com',
    url: `https://www.instagram.com/graphql/query/?query_hash=abc&variables=${vars}`,
  });

  await harvester.flush();
  assert.equal(tabGetCalled, false);
});

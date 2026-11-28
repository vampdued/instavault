'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_IG_APP_ID,
  DEFAULT_TAG_POSTS_QUERY_HASH,
  compareMediaCandidates,
  extractMediaItemsFromPost,
  createInstagramFeedFetcher,
} = require('../js/instagram-feed-fetcher.js');

function createMockEnv(overrides = {}) {
  const storageData = Object.assign(
    {
      instaHeaders: {
        'x-ig-app-id': '111222333',
        'x-asbd-id': '999888',
        'x-ig-www-claim': 'hmac.claim',
      },
      instaQueryHash: {},
    },
    overrides.storageData || {},
  );

  const storage = {
    async get(key) {
      return { [key]: storageData[key] };
    },
  };

  const cookies =
    overrides.cookies ||
    {
      async get() {
        return { value: 'csrf-token-123' };
      },
    };

  const sleeps = [];
  const sleep =
    overrides.sleep ||
    (async (ms) => {
      sleeps.push(ms);
    });

  const requests = [];
  const http =
    overrides.http ||
    (async (url, init) => {
      requests.push({ url, init });
      return {
        status: 200,
        async json() {
          return { items: [] };
        },
      };
    });

  const fetcher = createInstagramFeedFetcher({
    http,
    cookies,
    storage,
    sleep,
    getMessage: (k) => (k === 'massPrefix' ? 'IG' : ''),
    backoffBaseMs: overrides.backoffBaseMs ?? 100,
    maxBackoffMultiplier: overrides.maxBackoffMultiplier ?? 3,
  });

  return { fetcher, requests, sleeps, storageData };
}

test('per-request backoff isolation: concurrent requests maintain independent retry delays', async () => {
  const delaysByReq = { a: [], b: [] };
  let aAttempts = 0;
  let bAttempts = 0;

  // Track which request is sleeping by passing distinct backoff-tracking fetchers or sharing one fetcher
  // Here we share ONE fetcher instance and interleave two concurrent fetchJsonWithBackoff calls.
  const recordedDelays = [];
  let activeTag = null;
  const fetcher = createInstagramFeedFetcher({
    backoffBaseMs: 100,
    maxBackoffMultiplier: 3,
    cookies: { async get() { return { value: 'tok' }; } },
    storage: { async get() { return {}; } },
    async sleep(ms) {
      recordedDelays.push({ tag: activeTag, ms });
      // Yield to event loop so concurrent calls truly interleave
      await Promise.resolve();
    },
    async http(url) {
      if (url.includes('/a/')) {
        aAttempts++;
        if (aAttempts <= 2) return { status: 429, async text() { return 'rate limited'; } };
        return { status: 200, async json() { return { items: [{ id: 'a-ok' }] }; } };
      }
      bAttempts++;
      return { status: 200, async json() { return { items: [{ id: 'b-ok' }] }; } };
    },
  });

  // Start request A (will fail twice: delays 100, 200, 300) and concurrently start request B (succeeds on first try: delay 100)
  const pA = (async () => {
    activeTag = 'a';
    return fetcher.getPostInfo({ postId: 'a' });
  })();
  const pB = (async () => {
    activeTag = 'b';
    return fetcher.getPostInfo({ postId: 'b' });
  })();

  const [resA, resB] = await Promise.all([pA, pB]);
  assert.deepEqual(resA, [{ id: 'a-ok' }]);
  assert.deepEqual(resB, [{ id: 'b-ok' }]);
  assert.equal(aAttempts, 3);
  assert.equal(bAttempts, 1);

  // Total sleeps: B had 1 sleep of 100ms; A had 3 sleeps (100, 200, 300).
  // If state were shared/racy, B could have seen 200ms or reset A back to 100ms.
  const allMs = recordedDelays.map((d) => d.ms).sort((x, y) => x - y);
  assert.deepEqual(allMs, [100, 100, 200, 300]);
});

test('null or missing csrftoken cookie returns { err: "no_token" } without crashing', async () => {
  const { fetcher } = createMockEnv({
    cookies: {
      async get() {
        return null;
      },
    },
  });

  const csrf = await fetcher.getCsrfToken();
  assert.equal(csrf, null);

  const res = await fetcher.getPostInfo({ postId: '12345' });
  assert.deepEqual(res, { err: 'no_token' });

  const infoRes = await fetcher.getUserInfo({ userName: 'natgeo' });
  assert.deepEqual(infoRes, { err: 'no_token' });
});

test('get_explorer_scroll_by_type uses POST (never GET with body) and parses sections', async () => {
  const { fetcher, requests } = createMockEnv({
    http: async (url, init) => {
      requests.push({ url, init });
      return {
        status: 200,
        async json() {
          return {
            more_available: true,
            next_max_id: 'cursor_2',
            next_page: 2,
            sections: [
              {
                feed_type: 'media',
                layout_content: {
                  medias: [{ media: { id: 'm1' } }, { media: { id: 'm2' } }],
                },
              },
              { feed_type: 'other', layout_content: {} },
            ],
          };
        },
      };
    },
  });

  const res = await fetcher.getExplorerScrollByType({
    searchId: 'nature',
    maxId: 'cursor_1',
    pageNum: 1,
    type: 'tags',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://i.instagram.com/api/v1/tags/nature/sections/');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers['x-instagram-ajax'], DEFAULT_IG_APP_ID);
  assert.equal(requests[0].init.headers['x-requested-with'], 'XMLHttpRequest');
  assert.ok(requests[0].init.body instanceof URLSearchParams);
  assert.equal(requests[0].init.body.get('max_id'), 'cursor_1');
  assert.equal(requests[0].init.body.get('page'), '1');

  assert.deepEqual(res, {
    feedInfo: [{ id: 'm1' }, { id: 'm2' }],
    maxId: 'cursor_2',
    nextPage: 2,
  });

  const missing = await fetcher.getExplorerScrollByType({ searchId: 'nature', type: 'tags' });
  assert.deepEqual(missing, { err: 'no_scroll_info' });
});

test('get_user_highlights_list builds clean query_id URL without stray trailing quote', async () => {
  const { fetcher, requests } = createMockEnv({
    storageData: {
      instaQueryHash: { forHighlightsListId: '1784599999' },
    },
    http: async (url, init) => {
      requests.push({ url, init });
      return {
        status: 200,
        async json() {
          return {
            data: {
              user: {
                edge_highlight_reels: {
                  edges: [{ node: { id: 'hl_1' } }, { node: { id: 'hl_2' } }],
                },
              },
            },
          };
        },
      };
    },
  });

  const res = await fetcher.getUserHighlightsList({ userId: '42' });
  assert.deepEqual(res, ['hl_1', 'hl_2']);
  assert.equal(requests.length, 1);
  assert.ok(!requests[0].url.endsWith('"'), 'URL must not have stray trailing quote');
  assert.equal(
    requests[0].url,
    'https://www.instagram.com/graphql/query/?query_id=1784599999&user_id=42&include_chaining=false&include_reel=true&include_suggested_users=false&include_logged_out_extras=false&include_live_status=false&include_highlight_reels=true',
  );
});

test('media-candidate normalization handles carousel, video+thumb, and highest resolution selection', () => {
  const sorted = [
    { width: 640, height: 800, url: 'small.jpg' },
    { width: 1080, height: 1350, url: 'large.jpg' },
    { width: 750, height: 937, url: 'med.jpg' },
  ].sort(compareMediaCandidates);
  assert.equal(sorted[0].url, 'large.jpg');

  const apiResponse = {
    items: [
      {
        id: 'post_999',
        owner: { username: 'creator' },
        taken_at: 1700000000,
        caption: { text: 'Hello world' },
        like_count: 50,
        comment_count: 5,
        location: { name: 'Tokyo' },
        carousel_media: [
          {
            video_versions: [
              { width: 480, height: 854, url: 'https://cdn/v-low.mp4' },
              { width: 1080, height: 1920, url: 'https://cdn/v-hd.mp4' },
            ],
            image_versions2: {
              candidates: [
                { width: 320, height: 568, url: 'https://cdn/t-low.jpg' },
                { width: 1080, height: 1920, url: 'https://cdn/t-hd.jpg' },
              ],
            },
          },
          {
            image_versions2: {
              candidates: [
                { width: 640, height: 800, url: 'https://cdn/i-low.jpg' },
                { width: 1080, height: 1350, url: 'https://cdn/i-hd.jpg' },
              ],
            },
          },
        ],
      },
    ],
  };

  const items = extractMediaItemsFromPost(
    apiResponse,
    { pageType: 'profile', collectionName: 'Favorites', toDwThumb: true },
    (k) => (k === 'massPrefix' ? 'IG' : ''),
  );

  assert.equal(items.length, 3);
  assert.equal(items[0].url, 'https://cdn/v-hd.mp4');
  assert.equal(items[0].fileExt, 'mp4');
  assert.equal(items[0].index, 1);
  assert.equal(items[0].isThumb, false);
  assert.equal(items[0].username, 'creator');
  assert.equal(items[0].collectionName, 'Favorites');
  assert.equal(items[0].q, '1080x1920');
  assert.equal(items[0].loc, 'Tokyo');
  assert.equal(items[0].prefix, 'IG');

  assert.equal(items[1].url, 'https://cdn/t-hd.jpg');
  assert.equal(items[1].fileExt, 'jpg');
  assert.equal(items[1].index, 1);
  assert.equal(items[1].isThumb, true);

  assert.equal(items[2].url, 'https://cdn/i-hd.jpg');
  assert.equal(items[2].fileExt, 'jpg');
  assert.equal(items[2].index, 2);
  assert.equal(items[2].isThumb, false);
});

test('get_media_from_post handles HTTP errors cleanly without undeclared queryHash crash', async () => {
  const { fetcher } = createMockEnv({
    backoffBaseMs: 1,
    maxBackoffMultiplier: 1,
    http: async () => ({ status: 500, async text() { return 'err'; } }),
  });

  const res1 = await fetcher.getMediaFromPost({ pk: '111' });
  assert.deepEqual(res1, { err: 'empty_response' });

  // After >3 sequential failures, short-circuits with { err: true }
  await fetcher.getMediaFromPost({ pk: '112' });
  await fetcher.getMediaFromPost({ pk: '113' });
  await fetcher.getMediaFromPost({ pk: '114' });
  const res5 = await fetcher.getMediaFromPost({ pk: '115' });
  assert.deepEqual(res5, { err: true });
});

test('preserves exact response shapes for get_user_posts_alt fallback, get_user_info, and get_user_tag_posts default hash', async () => {
  const { fetcher: failingFetcher } = createMockEnv({
    backoffBaseMs: 1,
    maxBackoffMultiplier: 1,
    http: async () => ({ status: 404, async text() { return 'not found'; } }),
  });

  const altFail = await failingFetcher.getUserPostsAlt({ userName: 'alice' });
  assert.deepEqual(altFail, { tryUserPost: true });

  const { fetcher, requests } = createMockEnv({
    http: async (url, init) => {
      requests.push({ url, init });
      if (url.includes('web_profile_info')) {
        return {
          status: 200,
          async json() {
            return {
              data: {
                user: {
                  id: 'u1',
                  username: 'alice',
                  edge_owner_to_timeline_media: {
                    count: 10,
                    edges: [{ node: { id: 'p1' } }],
                    page_info: { end_cursor: 'c1', has_next_page: true },
                  },
                },
              },
            };
          },
        };
      }
      return {
        status: 200,
        async json() {
          return {
            data: {
              user: {
                edge_user_to_photos_of_you: {
                  edges: [{ node: { id: 't1' } }],
                  page_info: { end_cursor: 'tc1', has_next_page: false },
                },
              },
            },
          };
        },
      };
    },
  });

  const userInfo = await fetcher.getUserInfo({ userName: 'alice' });
  assert.deepEqual(userInfo, {
    endCursor: 'c1',
    hasNextPage: true,
    userId: 'u1',
    userName: 'alice',
    postsAmount: 10,
    postsFeedInfo: [{ node: { id: 'p1' } }],
  });

  const tagPosts = await fetcher.getUserTagPosts({ userId: 'u1' });
  assert.deepEqual(tagPosts, {
    maxId: 'tc1',
    hasNextPage: false,
    feedInfo: [{ node: { id: 't1' } }],
  });
  assert.ok(requests[1].url.includes(`query_hash=${DEFAULT_TAG_POSTS_QUERY_HASH}`));
});

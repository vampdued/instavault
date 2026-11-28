'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_DOC_IDS,
  parseDashManifest,
  selectBestRepresentation,
  extractBestDash,
  normalizeReelItems,
  decodeMediaCacheId,
  createBrowserProbeAdapter,
  createStoryAcquisition,
} = require('../js/story-acquisition.js');
const { classifyInstagramRoute } = require('../js/route-classifier.js');

const SAMPLE_DASH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011">
  <Period>
    <AdaptationSet mimeType="video/mp4">
      <Representation id="v1" width="720" height="1280" bandwidth="1200000" codecs="avc1.64001f">
        <BaseURL>https://cdn.example.com/v720.mp4?a=1&amp;b=2</BaseURL>
      </Representation>
      <Representation id="v2" width="1080" height="1920" bandwidth="2500000" codecs="avc1.64002a">
        <BaseURL>https://cdn.example.com/v1080_low.mp4</BaseURL>
      </Representation>
      <Representation id="v3" width="1080" height="1920" bandwidth="4200000" codecs="vp09.00.41.08">
        <BaseURL>https://cdn.example.com/v1080_high.mp4?sig=xyz&amp;oe=123</BaseURL>
      </Representation>
    </AdaptationSet>
    <AdaptationSet mimeType="audio/mp4">
      <Representation id="a1" bandwidth="64000" codecs="mp4a.40.5">
        <BaseURL>https://cdn.example.com/a64.m4a</BaseURL>
      </Representation>
      <Representation id="a2" bandwidth="128000" codecs="mp4a.40.2">
        <BaseURL>https://cdn.example.com/a128.m4a?k=1&amp;v=2</BaseURL>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

test('parses DASH XML manifest and selects best video and audio representations', () => {
  const reps = parseDashManifest(SAMPLE_DASH_XML);
  assert.equal(reps.length, 5);

  const bestVideo = selectBestRepresentation(reps, 'video');
  assert.equal(bestVideo.width, 1080);
  assert.equal(bestVideo.height, 1920);
  assert.equal(bestVideo.bandwidth, 4200000);
  assert.equal(bestVideo.url, 'https://cdn.example.com/v1080_high.mp4?sig=xyz&oe=123');

  const bestAudio = selectBestRepresentation(reps, 'audio');
  assert.equal(bestAudio.bandwidth, 128000);
  assert.equal(bestAudio.url, 'https://cdn.example.com/a128.m4a?k=1&v=2');

  const dash = extractBestDash({ video_dash_manifest: SAMPLE_DASH_XML, has_audio: true });
  assert.deepEqual(dash, {
    dashVideoUrl: 'https://cdn.example.com/v1080_high.mp4?sig=xyz&oe=123',
    dashAudioUrl: 'https://cdn.example.com/a128.m4a?k=1&v=2',
    width: 1080,
    height: 1920,
  });

  // Malformed XML returns empty list and null DASH
  assert.deepEqual(parseDashManifest('<MPD><broken'), []);
  assert.equal(extractBestDash({ video_dash_manifest: '<MPD><broken', has_audio: true }), null);
});

test('falls back to progressive video when DASH has_audio=true lacks an audio track', () => {
  const videoOnlyDash = `<MPD><Period><AdaptationSet mimeType="video/mp4">
    <Representation width="1080" height="1920" bandwidth="3000000">
      <BaseURL>https://cdn.example.com/v_only.mp4</BaseURL>
    </Representation>
  </AdaptationSet></Period></MPD>`;

  // has_audio=true with no audio track => null (forces progressive fallback)
  assert.equal(extractBestDash({ video_dash_manifest: videoOnlyDash, has_audio: true }), null);

  // has_audio=false with no audio track => allowed
  const silentDash = extractBestDash({ video_dash_manifest: videoOnlyDash, has_audio: false });
  assert.equal(silentDash.dashVideoUrl, 'https://cdn.example.com/v_only.mp4');
  assert.equal(silentDash.dashAudioUrl, '');

  const normalized = normalizeReelItems(
    {
      user: { username: 'creator', pk: '999' },
      items: [
        {
          pk: '3456789012345678901',
          code: 'C_VID_1',
          media_type: 2,
          taken_at: 1700000000,
          has_audio: true,
          video_dash_manifest: videoOnlyDash,
          video_versions: [
            { width: 480, height: 854, url: 'https://cdn.example.com/low.mp4' },
            { width: 720, height: 1280, url: 'https://cdn.example.com/prog720.mp4' },
          ],
          image_versions2: {
            candidates: [{ width: 720, height: 1280, url: 'https://cdn.example.com/poster.jpg' }],
          },
        },
      ],
    },
    'stories',
    '',
  );

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].url, 'https://cdn.example.com/prog720.mp4');
  assert.equal(normalized[0].dashVideoUrl, '');
  assert.equal(normalized[0].dashAudioUrl, '');
  assert.equal(normalized[0].fileExt, 'mp4');
  assert.equal(normalized[0].previewUrl, 'https://cdn.example.com/poster.jpg');
});

test('decodes ig_cache_key (including double-encoded & suffixed keys)', () => {
  const b64 = Buffer.from('3456789012345678901').toString('base64');
  const encodedOnce = encodeURIComponent(b64);
  const encodedTwice = encodeURIComponent(encodedOnce);

  assert.equal(
    decodeMediaCacheId(`https://cdn.example.com/img.jpg?ig_cache_key=${encodedTwice}.3-ccb7-5`),
    '3456789012345678901',
  );
  assert.equal(decodeMediaCacheId('blob:https://www.instagram.com/uuid-123'), '');
  assert.equal(decodeMediaCacheId('https://cdn.example.com/no-key.jpg'), '');
});

test('normalizes mixed image + video highlight items with highlight title', () => {
  const items = normalizeReelItems(
    {
      user: { username: 'natgeo', pk: '787132' },
      items: [
        {
          pk: '1111111111111111111',
          media_type: 1,
          taken_at: 1700000100,
          image_versions2: {
            candidates: [
              { width: 640, height: 1136, url: 'https://cdn.example.com/small.jpg' },
              { width: 1080, height: 1920, url: 'https://cdn.example.com/full.jpg' },
            ],
          },
        },
        {
          pk: '2222222222222222222',
          code: 'HL_VID',
          media_type: 2,
          taken_at: 1700000200,
          has_audio: true,
          video_dash_manifest: SAMPLE_DASH_XML,
          video_versions: [{ width: 720, height: 1280, url: 'https://cdn.example.com/prog.mp4' }],
        },
      ],
    },
    'highlights',
    'Arctic',
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].username, 'natgeo');
  assert.equal(items[0].userName, 'natgeo_Arctic');
  assert.equal(items[0].url, 'https://cdn.example.com/full.jpg');
  assert.equal(items[0].fileExt, 'jpg');
  assert.equal(items[0].pt, 'highlights');

  assert.equal(items[1].dashVideoUrl, 'https://cdn.example.com/v1080_high.mp4?sig=xyz&oe=123');
  assert.equal(items[1].dashAudioUrl, 'https://cdn.example.com/a128.m4a?k=1&v=2');
  assert.equal(items[1].width, 1080);
  assert.equal(items[1].height, 1920);
});

test('resolves active slide by URL media ID, ig_cache_key, pathname, and progress bar', () => {
  const id2CacheKey = encodeURIComponent(Buffer.from('2222222222222222222').toString('base64'));
  const slides = [
    { id: '1111111111111111111', url: 'https://cdn.example.com/a/slide1.jpg', previewUrl: '' },
    { id: '2222222222222222222', url: `https://cdn.example.com/a/slide2.jpg?ig_cache_key=${id2CacheKey}`, previewUrl: '' },
    { id: '3333333333333333333', url: 'https://cdn.example.com/a/slide3.mp4', previewUrl: 'https://cdn.example.com/p/slide3_poster.jpg' },
  ];

  // 1. URL media ID match
  let engine = createStoryAcquisition({
    routeClassifier: classifyInstagramRoute,
    dom: { getPathname: () => '/stories/alice/2222222222222222222/' },
  });
  assert.equal(engine.resolveCurrentSlide(slides).id, '2222222222222222222');

  // 2. Visible media ig_cache_key match
  engine = createStoryAcquisition({
    routeClassifier: classifyInstagramRoute,
    dom: {
      getPathname: () => '/stories/highlights/17999/',
      getVisibleStoryMedia: () => ({
        sourceUrl: `https://other-cdn.example.com/img.jpg?ig_cache_key=${id2CacheKey}`,
        posterUrl: '',
      }),
    },
  });
  assert.equal(engine.resolveCurrentSlide(slides).id, '2222222222222222222');

  // 3. Visible media poster pathname match
  engine = createStoryAcquisition({
    routeClassifier: classifyInstagramRoute,
    dom: {
      getPathname: () => '/stories/highlights/17999/',
      getVisibleStoryMedia: () => ({
        sourceUrl: 'blob:https://www.instagram.com/abc',
        posterUrl: 'https://cdn2.example.com/p/slide3_poster.jpg?token=1',
      }),
    },
  });
  assert.equal(engine.resolveCurrentSlide(slides).id, '3333333333333333333');

  // 4. Active progress-bar segment index match
  engine = createStoryAcquisition({
    routeClassifier: classifyInstagramRoute,
    dom: {
      getPathname: () => '/stories/highlights/17999/',
      getVisibleStoryMedia: () => ({ sourceUrl: '', posterUrl: '' }),
      getProgressSegments: () => [{ childElementCount: 0 }, { childElementCount: 0 }, { childElementCount: 1 }],
    },
  });
  assert.equal(engine.resolveCurrentSlide(slides).id, '3333333333333333333');
});

test('request-correlated probe adapter resolves immediately without sleep races and ignores mismatched requestIds', async () => {
  const listeners = new Map();
  const fakeWindow = {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      if (listeners.has(type)) listeners.get(type).delete(fn);
    },
    dispatchEvent(ev) {
      const set = listeners.get(ev.type);
      if (set) {
        for (const fn of [...set]) fn(ev);
      }
    },
  };

  // Simulate story-bridge.js responding with a stale event first, then the correlated requestId
  fakeWindow.addEventListener('iv:requestStoryUser', (e) => {
    const { requestId } = e.detail;
    // Unrelated/stale response with different requestId must be ignored
    fakeWindow.dispatchEvent({
      type: 'iv:storyUser',
      detail: { requestId: 'stale_id', username: 'wrong_user', userId: '0000' },
    });
    // Correlated response arrives on next microtask
    queueMicrotask(() => {
      fakeWindow.dispatchEvent({
        type: 'iv:storyUser',
        detail: { requestId, username: 'alice', userId: '424242' },
      });
    });
  });

  const probe = createBrowserProbeAdapter(fakeWindow, {
    timeoutMs: 200,
    CustomEvent: function (type, init) {
      return { type, detail: init && init.detail };
    },
  });

  let httpCalled = false;
  const engine = createStoryAcquisition({
    probe,
    http: async () => {
      httpCalled = true;
      throw new Error('Should not hit GraphQL when probe succeeds');
    },
  });

  const start = Date.now();
  const uid = await engine.getUserId('Alice');
  const elapsed = Date.now() - start;

  assert.equal(uid, '424242');
  assert.equal(httpCalled, false);
  assert.ok(elapsed < 50, `Expected immediate correlated resolution, took ${elapsed}ms`);
});

test('falls back to GraphQL with storage doc_id override when probe times out', async () => {
  const postedBodies = [];
  const engine = createStoryAcquisition({
    probe: {
      subscribe: () => () => {},
      requestStoryUser: async () => null,
    },
    storage: {
      async getDocIds() {
        return { PolarisSearchBoxRefetchableQuery: '99999999999' };
      },
    },
    http: async (_url, init) => {
      postedBodies.push(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            xdt_api__v1__fbsearch__topsearch_connection: {
              users: [{ user: { username: 'bob', id: '777888' } }],
            },
          },
        }),
      };
    },
  });

  assert.equal(await engine.getDocId('PolarisSearchBoxRefetchableQuery'), '99999999999');
  assert.equal(
    await engine.getDocId('PolarisStoriesV3ReelPageGalleryQuery'),
    DEFAULT_DOC_IDS.PolarisStoriesV3ReelPageGalleryQuery,
  );

  const uid = await engine.getUserId('bob');
  assert.equal(uid, '777888');
  assert.equal(postedBodies.length, 1);
  assert.ok(postedBodies[0].includes('doc_id=99999999999'));
});

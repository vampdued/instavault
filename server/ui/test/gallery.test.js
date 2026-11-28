import test from 'node:test';
import assert from 'node:assert/strict';
import { createDaemonClient } from '../js/api.js';
import { buildCardMediaMarkup, createVideoFallbackObserver } from '../js/views/gallery.js';

test('buildCardMediaMarkup renders lazy img thumbnail for videos and photo img for images', () => {
  const client = createDaemonClient({ baseUrl: 'http://localhost:19201' });

  const videoMarkup = buildCardMediaMarkup(
    { relativePath: 'alice\\clip_1.mp4' },
    { username: 'alice', isVideo: true, client, index: 8 },
  );
  assert.match(videoMarkup, /<img class="vid-thumb"/);
  assert.match(videoMarkup, /src="http:\/\/localhost:19201\/api\/thumb\/alice\/clip_1\.mp4"/);
  assert.match(videoMarkup, /data-video-src="http:\/\/localhost:19201\/api\/media\/alice\/clip_1\.mp4"/);
  assert.match(videoMarkup, /loading="lazy"/);
  assert.doesNotMatch(videoMarkup, /<video/);

  const photoMarkup = buildCardMediaMarkup(
    { relativePath: 'alice\\photo_1.jpg' },
    { username: 'alice', isVideo: false, client, index: 0 },
  );
  assert.match(photoMarkup, /<img src="http:\/\/localhost:19201\/api\/media\/alice\/photo_1\.jpg"/);
  assert.match(photoMarkup, /fetchpriority="high"/);
  assert.doesNotMatch(photoMarkup, /vid-thumb/);
});

test('createVideoFallbackObserver activates metadata preload and unobserves intersecting videos', () => {
  const observed = [];
  const unobserved = [];
  let observerCb = null;

  class MockIntersectionObserver {
    constructor(cb, options) {
      observerCb = cb;
      this.options = options;
    }
    observe(el) { observed.push(el); }
    unobserve(el) { unobserved.push(el); }
    disconnect() { this.disconnected = true; }
  }

  const obs = createVideoFallbackObserver({ IntersectionObserverImpl: MockIntersectionObserver });
  const attrs = {};
  const vidA = {
    preload: 'none',
    dataset: { src: '/api/media/a.mp4#t=0.001' },
    getAttribute: k => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = v; },
  };
  const vidB = {
    preload: 'none',
    dataset: { src: '/api/media/b.mp4#t=0.001' },
    getAttribute: () => null,
    setAttribute: () => { throw new Error('should not activate non-intersecting video'); },
  };

  obs.observe(vidA);
  obs.observe(vidB);
  assert.equal(observed.length, 2);

  observerCb(
    [
      { target: vidA, isIntersecting: true, intersectionRatio: 0.5 },
      { target: vidB, isIntersecting: false, intersectionRatio: 0 },
    ],
    { unobserve: el => unobserved.push(el) },
  );

  assert.equal(vidA.preload, 'metadata');
  assert.equal(attrs.src, '/api/media/a.mp4#t=0.001');
  assert.deepEqual(unobserved, [vidA]);
});

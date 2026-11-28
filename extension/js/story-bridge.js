/**
 * InstaVault MAIN-world Story Bridge
 * Reads live username & userId from Instagram's React Fiber on /stories/ routes
 * using a request-correlated handshake (requestId on iv:requestStoryUser / iv:storyUser)
 * instead of brittle fixed-delay sleeps.
 */
(() => {
  'use strict';

  function isUserStoryRoute(pathname) {
    if (typeof window.classifyInstagramRoute === 'function') {
      return window.classifyInstagramRoute(pathname || '').type === 'story';
    }
    return Boolean(
      pathname && pathname.startsWith('/stories/') && !pathname.startsWith('/stories/highlights/'),
    );
  }

  function getValueByKey(obj, key) {
    if (typeof obj !== 'object' || obj === null) return null;
    const stack = [obj];
    const visited = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      try {
        if (current[key] !== undefined) return current[key];
      } catch (err) {
        if (err && err.name === 'SecurityError') continue;
      }
      let values;
      try {
        values = Object.values(current);
      } catch {
        continue;
      }
      for (const value of values) {
        if (typeof value === 'object' && value !== null) {
          stack.push(value);
        }
      }
    }
    return null;
  }

  function readStoryOwnerNow() {
    const sections = document.querySelectorAll('section');
    const section = sections.length ? sections[sections.length - 1] : null;
    if (!section) return null;
    const username = getValueByKey(section, 'username');
    const userId = getValueByKey(section, 'userId');
    if (username && userId) {
      return { username: String(username), userId: String(userId) };
    }
    return null;
  }

  function emitStoryUser(detail) {
    window.dispatchEvent(new CustomEvent('iv:storyUser', { detail }));
  }

  /**
   * Attempts immediate React Fiber extraction; if not mounted yet, retries across a
   * bounded number of animation frames and resolves as soon as the owner appears.
   */
  function extractStoryOwner(pathname, requestId = null) {
    if (!isUserStoryRoute(pathname)) {
      if (requestId) {
        emitStoryUser({ requestId, username: null, userId: null, found: false });
      }
      return;
    }

    const immediate = readStoryOwnerNow();
    if (immediate) {
      emitStoryUser({
        requestId,
        username: immediate.username,
        userId: immediate.userId,
        found: true,
      });
      return;
    }

    let attempts = 0;
    const MAX_FRAMES = 6;
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (fn) => setTimeout(fn, 16);

    function pollFrame() {
      attempts++;
      const found = readStoryOwnerNow();
      if (found) {
        emitStoryUser({
          requestId,
          username: found.username,
          userId: found.userId,
          found: true,
        });
        return;
      }
      if (attempts < MAX_FRAMES) {
        schedule(pollFrame);
      } else if (requestId) {
        emitStoryUser({ requestId, username: null, userId: null, found: false });
      }
    }

    schedule(pollFrame);
  }

  if (typeof navigation !== 'undefined' && navigation.addEventListener) {
    navigation.addEventListener('navigate', (e) => {
      try {
        const url = new URL(e.destination.url);
        extractStoryOwner(url.pathname, null);
      } catch {}
    });
  }

  window.addEventListener('iv:requestStoryUser', (e) => {
    const requestId = (e && e.detail && e.detail.requestId) || null;
    extractStoryOwner(window.location.pathname, requestId);
  });

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => extractStoryOwner(window.location.pathname, null),
      { once: true },
    );
  } else {
    extractStoryOwner(window.location.pathname, null);
  }
})();

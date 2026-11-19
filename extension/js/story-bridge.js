/**
 * InstaVault MAIN-world Story Bridge
 * Reads live username & userId from Instagram's React Fiber on /stories/ routes
 * so user resolution succeeds even when search GraphQL is rate-limited.
 */
(() => {
  'use strict';

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

  function extractStoryOwner(pathname) {
    if (!pathname || !pathname.startsWith('/stories/') || pathname.startsWith('/stories/highlights/')) {
      return;
    }
    // Wait a tick so Instagram finishes rendering the real story section past ads
    setTimeout(() => {
      const sections = document.querySelectorAll('section');
      const section = sections.length ? sections[sections.length - 1] : null;
      if (!section) return;
      const username = getValueByKey(section, 'username');
      const userId = getValueByKey(section, 'userId');
      if (username && userId) {
        window.dispatchEvent(
          new CustomEvent('iv:storyUser', {
            detail: { username: String(username), userId: String(userId) },
          }),
        );
      }
    }, 50);
  }

  if (typeof navigation !== 'undefined' && navigation.addEventListener) {
    navigation.addEventListener('navigate', (e) => {
      try {
        const url = new URL(e.destination.url);
        extractStoryOwner(url.pathname);
      } catch {}
    });
  }

  window.addEventListener('iv:requestStoryUser', () => {
    extractStoryOwner(window.location.pathname);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => extractStoryOwner(window.location.pathname), { once: true });
  } else {
    extractStoryOwner(window.location.pathname);
  }
})();

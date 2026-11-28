/**
 * InstaVault Browser Wiring for Story & Highlight Acquisition
 * Instantiates InstaVaultStoryAcquisition onto window.InstaVaultStoryEngine,
 * preserving the public surface consumed by app.js.
 */
(() => {
  'use strict';

  const { createStoryAcquisition, createBrowserProbeAdapter } =
    window.InstaVaultStoryAcquisition;

  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
    );
    return match ? decodeURIComponent(match[1]) : '';
  }

  function setPreferredMediaResolutionCookies() {
    try {
      const width = 3840 / 2;
      const height = 2160 / 2 - 100;
      document.cookie = `wd=${width}x${height}; path=/; SameSite=Lax`;
      document.cookie = 'dpr=2; path=/; SameSite=Lax';
    } catch {}
  }

  function getFbDtsg() {
    for (const script of document.scripts) {
      const text = script.textContent || '';
      const match =
        text.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/) ||
        text.match(/"dtsg":\s*\{\s*"token":"([^"]+)"/);
      if (match) return match[1];
    }
    const input = document.querySelector('input[name="fb_dtsg"]');
    return input ? input.value : '';
  }

  function findStoryToolbar() {
    const playSvg = document.querySelector('svg[aria-label="Play"], svg[aria-label="Pause"]');
    const btn = playSvg && playSvg.closest('[role="button"], button');
    if (btn && btn.parentElement && btn.parentElement.parentElement) {
      return btn.parentElement.parentElement;
    }
    return null;
  }

  function getVisibleStoryMedia() {
    const candidates = [...document.querySelectorAll('img, video')]
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(
        ({ rect }) =>
          rect.width >= 240 &&
          rect.height >= 300 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth,
      )
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
    const top = candidates[0]?.el;
    return {
      sourceUrl: (top && (top.currentSrc || top.src)) || '',
      posterUrl: top instanceof HTMLVideoElement ? top.poster || '' : '',
    };
  }

  const storage = {
    getDocIds() {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get('instaDocIds', (res) => {
            resolve((res && res.instaDocIds) || {});
          });
        } catch {
          resolve({});
        }
      });
    },
  };

  const dom = {
    getOrigin: () => window.location.origin,
    getHref: () => window.location.href,
    getPathname: () => window.location.pathname,
    getCookie,
    getWwwClaim: () => sessionStorage.getItem('www-claim-v2') || '0',
    getFbDtsg,
    setPreferredMediaResolutionCookies,
    getVisibleStoryMedia,
    findStoryToolbar,
  };

  const engine = createStoryAcquisition({
    http: (url, init) => fetch(url, init),
    probe: createBrowserProbeAdapter(window, { timeoutMs: 400 }),
    storage,
    dom,
    routeClassifier: window.classifyInstagramRoute,
  });

  window.InstaVaultStoryEngine = {
    getUserId: engine.getUserId,
    fetchUserStories: engine.fetchUserStories,
    fetchHighlight: engine.fetchHighlight,
    extractBestDash: engine.extractBestDash,
    resolveCurrentSlide: engine.resolveCurrentSlide,
    findStoryToolbar: engine.findStoryToolbar,
    setPreferredMediaResolutionCookies: engine.setPreferredMediaResolutionCookies,
  };
})();

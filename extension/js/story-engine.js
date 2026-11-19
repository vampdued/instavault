/**
 * InstaVault Story, Highlight & High-Quality Media Engine
 * - Uses RelayModern POST /graphql/query with live fb_dtsg & www-claim-v2
 * - Sets preferred high-res cookies (wd/dpr) before GraphQL fetches
 * - Extracts best DASH video + audio stream URLs for Go-server ffmpeg muxing
 * - Resolves the currently playing Story slide for single-slide downloads
 */
(() => {
  'use strict';

  const IG_BASE_URL = window.location.origin;
  const IG_APP_ID = '936619743392459';
  const DEFAULT_DOC_IDS = {
    PolarisSearchBoxRefetchableQuery: '27706427925724183',
    PolarisStoriesV3ReelPageGalleryQuery: '28262315486766731',
    PolarisStoriesV3HighlightsPageQuery: '28325328583775973',
  };

  const userIdCache = new Map();

  window.addEventListener('iv:storyUser', (e) => {
    const detail = e && e.detail;
    if (detail && detail.username && detail.userId) {
      userIdCache.set(String(detail.username).toLowerCase(), String(detail.userId));
    }
  });

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
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

  function getDocId(friendlyName) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get('instaDocIds', (res) => {
          const map = (res && res.instaDocIds) || {};
          resolve(map[friendlyName] || DEFAULT_DOC_IDS[friendlyName]);
        });
      } catch {
        resolve(DEFAULT_DOC_IDS[friendlyName]);
      }
    });
  }

  async function postGraphQL(friendlyName, variables) {
    setPreferredMediaResolutionCookies();
    const docId = await getDocId(friendlyName);
    const csrf = getCookie('csrftoken');
    const wwwClaim = sessionStorage.getItem('www-claim-v2') || '0';
    const fbDtsg = getFbDtsg();

    const params = new URLSearchParams({
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: friendlyName,
      doc_id: docId,
      variables: JSON.stringify(variables),
      server_timestamps: 'true',
    });
    if (fbDtsg) params.set('fb_dtsg', fbDtsg);

    const res = await fetch(`${IG_BASE_URL}/graphql/query`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      referrer: window.location.href,
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-csrftoken': csrf,
        'x-fb-friendly-name': friendlyName,
        'x-ig-app-id': IG_APP_ID,
        'x-ig-www-claim': wwwClaim,
        'x-requested-with': 'XMLHttpRequest',
      },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`GraphQL ${friendlyName} failed (${res.status})`);
    return res.json();
  }

  // ── DASH Manifest Parsing (offloads actual muxing to Go server + ffmpeg) ──
  function getXmlElements(parent, localName) {
    return Array.from(parent.getElementsByTagNameNS('*', localName));
  }

  function parseDashManifest(manifest) {
    if (!manifest || typeof manifest !== 'string') return [];
    try {
      const xml = new DOMParser().parseFromString(manifest, 'application/xml');
      if (getXmlElements(xml, 'parsererror').length) return [];
      return getXmlElements(xml, 'Representation')
        .map((rep) => {
          const set = rep.parentElement;
          const baseUrl = getXmlElements(rep, 'BaseURL')[0]?.textContent?.trim();
          return {
            url: baseUrl || '',
            codec: rep.getAttribute('codecs') || '',
            mimeType: rep.getAttribute('mimeType') || set?.getAttribute('mimeType') || '',
            width: Number(rep.getAttribute('width') || set?.getAttribute('width') || 0),
            height: Number(rep.getAttribute('height') || set?.getAttribute('height') || 0),
            bandwidth: Number(rep.getAttribute('bandwidth') || rep.getAttribute('FBAvgBitrate') || 0),
            contentLength: Number(rep.getAttribute('FBContentLength') || 0),
          };
        })
        .filter((r) => r.url);
    } catch {
      return [];
    }
  }

  function selectBestRepresentation(reps, type) {
    const candidates = reps.filter((r) => r.mimeType.startsWith(`${type}/`));
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      if (type === 'video') {
        const px = b.width * b.height - a.width * a.height;
        if (px) return px;
      }
      return b.bandwidth - a.bandwidth || b.contentLength - a.contentLength;
    });
    return candidates[0];
  }

  function extractBestDash(item) {
    const manifest = item && item.video_dash_manifest;
    if (!manifest) return null;
    const reps = parseDashManifest(manifest);
    const video = selectBestRepresentation(reps, 'video');
    const audio = selectBestRepresentation(reps, 'audio');
    if (!video) return null;
    if (item.has_audio === true && !audio) return null;
    return {
      dashVideoUrl: video.url,
      dashAudioUrl: audio ? audio.url : '',
      width: video.width,
      height: video.height,
    };
  }

  function selectLargestProgressive(items) {
    if (!Array.isArray(items) || !items.length) return null;
    return items.reduce((best, cur) => {
      const bp = Number(best.width || 0) * Number(best.height || 0);
      const cp = Number(cur.width || 0) * Number(cur.height || 0);
      return cp > bp ? cur : best;
    }, items[0]);
  }

  function normalizeReelItems(node, pageType, highlightTitle) {
    if (!node || !Array.isArray(node.items) || !node.items.length) return [];
    const baseUser = (node.user && node.user.username) || '';
    const userPk = (node.user && (node.user.pk || node.user.id)) || null;
    const displayUser = highlightTitle ? `${baseUser}_${highlightTitle}` : baseUser;

    const out = [];
    for (const item of node.items) {
      if (!item || !item.media_type) continue;
      const isVideo = item.media_type === 2;
      const list = isVideo ? item.video_versions : item.image_versions2 && item.image_versions2.candidates;
      const best = selectLargestProgressive(list);
      if (!best || !(best.url || best.src)) continue;

      const dash = isVideo ? extractBestDash(item) : null;
      const preview = isVideo && item.image_versions2 ? selectLargestProgressive(item.image_versions2.candidates) : best;
      const takenAt = item.taken_at ? parseInt(item.taken_at, 10) : 0;
      const id = String(item.pk || item.id || '');
      const shortcode = item.code || id;

      out.push({
        username: baseUser || displayUser,
        userName: displayUser,
        userPk,
        id,
        shortcode,
        url: best.url || best.src,
        previewUrl: (preview && (preview.url || preview.src)) || '',
        dashVideoUrl: dash ? dash.dashVideoUrl : '',
        dashAudioUrl: dash ? dash.dashAudioUrl : '',
        width: (dash && dash.width) || Number(best.width || 0),
        height: (dash && dash.height) || Number(best.height || 0),
        fileExt: isVideo ? 'mp4' : 'jpg',
        takenAt,
        pt: pageType || 'stories',
        pageType: pageType || 'stories',
        index: 0,
        isThumb: false,
      });
    }
    return out;
  }

  async function getUserId(username) {
    if (!username) return null;
    const key = String(username).toLowerCase();
    if (userIdCache.has(key)) return userIdCache.get(key);

    // Ask MAIN-world bridge once if we're currently on this user's story
    window.dispatchEvent(new CustomEvent('iv:requestStoryUser'));
    await new Promise((r) => setTimeout(r, 70));
    if (userIdCache.has(key)) return userIdCache.get(key);

    try {
      const json = await postGraphQL('PolarisSearchBoxRefetchableQuery', {
        data: {
          context: 'blended',
          include_reel: 'true',
          query: username,
          rank_token: '',
          search_surface: 'web_top_search',
        },
        hasQuery: true,
      });
      const users = json?.data?.xdt_api__v1__fbsearch__topsearch_connection?.users || [];
      if (!users.length) return null;
      const exact = users.find((u) => u.user && u.user.username && u.user.username.toLowerCase() === key);
      const id = String((exact || users[0]).user.id || (exact || users[0]).user.pk || '');
      if (id) userIdCache.set(key, id);
      return id || null;
    } catch (err) {
      console.warn('[InstaVault StoryEngine] getUserId failed:', err);
      return null;
    }
  }

  async function fetchUserStories(userId) {
    if (!userId) return null;
    try {
      const json = await postGraphQL('PolarisStoriesV3ReelPageGalleryQuery', {
        initial_reel_id: String(userId),
        reel_ids: [String(userId)],
        first: 3,
        last: 2,
        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true,
      });
      const node = json?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node;
      const items = normalizeReelItems(node, 'stories', '');
      return items.length ? items : null;
    } catch (err) {
      console.warn('[InstaVault StoryEngine] fetchUserStories failed:', err);
      return null;
    }
  }

  async function fetchHighlight(highlightId) {
    if (!highlightId) return null;
    try {
      const idStr = `highlight:${highlightId}`;
      const json = await postGraphQL('PolarisStoriesV3HighlightsPageQuery', {
        initial_reel_id: idStr,
        reel_ids: [idStr],
        first: 3,
        last: 2,
        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true,
      });
      const node = json?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node;
      const title = (node && (node.title || node.reel_title)) || '';
      const items = normalizeReelItems(node, 'highlights', title);
      return items.length ? items : null;
    } catch (err) {
      console.warn('[InstaVault StoryEngine] fetchHighlight failed:', err);
      return null;
    }
  }

  // ── Active Story Slide Resolver (for single-slide downloads) ──
  function getMediaId(val) {
    return String(val ?? '').match(/^\d+/)?.[0] ?? '';
  }

  function getMediaCacheId(mediaUrl) {
    if (!mediaUrl || mediaUrl.startsWith('blob:')) return '';
    try {
      let key = new URL(mediaUrl).searchParams.get('ig_cache_key') || '';
      for (let i = 0; i < 2; i++) {
        try { key = decodeURIComponent(key); } catch { break; }
      }
      return atob(key).match(/\d{10,}/)?.[0] ?? '';
    } catch {
      return '';
    }
  }

  function getUrlPath(u) {
    if (!u || u.startsWith('blob:')) return '';
    try { return new URL(u).pathname; } catch { return ''; }
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
      .filter(({ rect }) => rect.width >= 240 && rect.height >= 300 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
    const top = candidates[0]?.el;
    return {
      sourceUrl: (top && (top.currentSrc || top.src)) || '',
      posterUrl: top instanceof HTMLVideoElement ? top.poster || '' : '',
    };
  }

  function resolveCurrentSlide(items) {
    if (!Array.isArray(items) || !items.length) return null;
    if (items.length === 1) return items[0];

    // 1. Match by URL media ID (/stories/username/<mediaId>/)
    const parts = window.location.pathname.split('/').filter(Boolean);
    const urlMediaId = parts[0] === 'stories' && parts[1] !== 'highlights' && /^\d+$/.test(parts[2] || '') ? parts[2] : '';
    if (urlMediaId) {
      const byId = items.find((it) => getMediaId(it.id) === urlMediaId);
      if (byId) return byId;
    }

    // 2. Match by rendered <img>/<video> ig_cache_key or pathname
    const vis = getVisibleStoryMedia();
    for (const candidateUrl of [vis.sourceUrl, vis.posterUrl]) {
      if (!candidateUrl) continue;
      const cacheId = getMediaCacheId(candidateUrl);
      if (cacheId) {
        const hit = items.find((it) => getMediaId(it.id) === cacheId || getMediaCacheId(it.url) === cacheId || getMediaCacheId(it.previewUrl) === cacheId);
        if (hit) return hit;
      }
      const p = getUrlPath(candidateUrl);
      if (p) {
        const hit = items.find((it) => getUrlPath(it.url) === p || getUrlPath(it.previewUrl) === p);
        if (hit) return hit;
      }
    }

    // 3. Match by active progress-bar segment index
    const toolbar = findStoryToolbar();
    const segments = [...(toolbar?.previousElementSibling?.children ?? [])];
    if (segments.length === items.length) {
      const activeIdx = segments.findIndex((seg) => seg.childElementCount > 0);
      if (activeIdx >= 0 && activeIdx < items.length) return items[activeIdx];
    }

    return items[0];
  }

  window.InstaVaultStoryEngine = {
    getUserId,
    fetchUserStories,
    fetchHighlight,
    extractBestDash,
    resolveCurrentSlide,
    findStoryToolbar,
    setPreferredMediaResolutionCookies,
  };
})();

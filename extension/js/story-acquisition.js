/**
 * InstaVault Unified Story & Highlight Acquisition Engine
 * Consolidates user-ID resolution, GraphQL story/highlight queries, DASH manifest XML parsing
 * & representation selection, reel item normalization, ig_cache_key decoding, active-slide
 * resolution, and request-correlated MAIN-world probe handshakes behind explicit seams.
 */
(function (root) {
  'use strict';

  const IG_APP_ID = '936619743392459';
  const DEFAULT_DOC_IDS = Object.freeze({
    PolarisSearchBoxRefetchableQuery: '27706427925724183',
    PolarisStoriesV3ReelPageGalleryQuery: '28262315486766731',
    PolarisStoriesV3HighlightsPageQuery: '28325328583775973',
  });

  function decodeXmlEntities(str) {
    return String(str || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;
    const re = /([a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(attrString)) !== null) {
      const fullName = m[1];
      const localName = fullName.includes(':') ? fullName.split(':').pop() : fullName;
      const val = decodeXmlEntities(m[2] !== undefined ? m[2] : m[3]);
      attrs[fullName] = val;
      attrs[localName] = val;
    }
    return attrs;
  }

  /**
   * Pure-JS DASH MPD manifest parser that works identically in Chrome and Node 18
   * without requiring DOMParser. Inherits mimeType/width/height from parent AdaptationSet.
   */
  function parseDashManifest(manifest) {
    if (!manifest || typeof manifest !== 'string') return [];
    const trimmed = manifest.trim();
    if (!trimmed.startsWith('<')) return [];

    // Basic well-formedness check for MPD root or AdaptationSet/Representation presence
    if (/<parsererror\b/i.test(trimmed)) return [];
    if (/<MPD\b/i.test(trimmed) && !/<\/MPD>/i.test(trimmed)) return [];

    const results = [];

    function extractRepresentations(block, parentAttrs) {
      const repRe = /<(?:[\w-]+:)?Representation\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?Representation>/gi;
      let rm;
      while ((rm = repRe.exec(block)) !== null) {
        const attrs = parseAttributes(rm[1]);
        const body = rm[2];
        const baseUrlMatch = body.match(
          /<(?:[\w-]+:)?BaseURL\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?BaseURL>/i,
        );
        const url = baseUrlMatch ? decodeXmlEntities(baseUrlMatch[1].trim()) : '';
        if (!url) continue;

        results.push({
          url,
          codec: attrs.codecs || parentAttrs.codecs || '',
          mimeType: attrs.mimeType || parentAttrs.mimeType || '',
          width: Number(attrs.width || parentAttrs.width || 0),
          height: Number(attrs.height || parentAttrs.height || 0),
          bandwidth: Number(attrs.bandwidth || attrs.FBAvgBitrate || 0),
          contentLength: Number(attrs.FBContentLength || 0),
        });
      }
    }

    const setRe = /<(?:[\w-]+:)?AdaptationSet\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?AdaptationSet>/gi;
    let sm;
    let foundSet = false;
    while ((sm = setRe.exec(trimmed)) !== null) {
      foundSet = true;
      const setAttrs = parseAttributes(sm[1]);
      extractRepresentations(sm[2], setAttrs);
    }

    if (!foundSet) {
      extractRepresentations(trimmed, {});
    }

    return results;
  }

  function selectBestRepresentation(reps, type) {
    if (!Array.isArray(reps) || !reps.length) return null;
    const prefix = `${type}/`;
    const candidates = reps.filter((r) => r && typeof r.mimeType === 'string' && r.mimeType.startsWith(prefix));
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
      const list = isVideo
        ? item.video_versions
        : item.image_versions2 && item.image_versions2.candidates;
      const best = selectLargestProgressive(list);
      if (!best || !(best.url || best.src)) continue;

      const dash = isVideo ? extractBestDash(item) : null;
      const preview =
        isVideo && item.image_versions2
          ? selectLargestProgressive(item.image_versions2.candidates)
          : best;
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

  function getMediaId(val) {
    return String(val ?? '').match(/^\d+/)?.[0] ?? '';
  }

  function decodeBase64(str) {
    if (typeof atob === 'function') return atob(str);
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('binary');
    return '';
  }

  function decodeMediaCacheId(mediaUrl) {
    if (!mediaUrl || typeof mediaUrl !== 'string' || mediaUrl.startsWith('blob:')) return '';
    try {
      let key = new URL(mediaUrl).searchParams.get('ig_cache_key') || '';
      if (!key) return '';
      for (let i = 0; i < 2; i++) {
        try {
          key = decodeURIComponent(key);
        } catch (_) {
          break;
        }
      }
      // Strip optional suffix like ".3-ccb7-5" before base64 decoding if present
      const b64Part = key.split('.')[0];
      return decodeBase64(b64Part).match(/\d{10,}/)?.[0] ?? '';
    } catch (_) {
      return '';
    }
  }

  function getUrlPath(u) {
    if (!u || typeof u !== 'string' || u.startsWith('blob:')) return '';
    try {
      return new URL(u).pathname;
    } catch (_) {
      return '';
    }
  }

  /**
   * Request-correlated MAIN-world CustomEvent probe adapter (zero sleep races).
   */
  function createBrowserProbeAdapter(eventTarget, opts = {}) {
    const target = eventTarget || (typeof window !== 'undefined' ? window : null);
    const defaultTimeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 400;
    let seq = 0;

    return {
      subscribe(onStoryUser) {
        if (!target || typeof target.addEventListener !== 'function') return () => {};
        const handler = (e) => {
          const detail = e && e.detail;
          if (detail && detail.username && detail.userId) {
            onStoryUser({
              username: String(detail.username),
              userId: String(detail.userId),
              requestId: detail.requestId || null,
            });
          }
        };
        target.addEventListener('iv:storyUser', handler);
        return () => target.removeEventListener('iv:storyUser', handler);
      },

      requestStoryUser(username, reqOpts = {}) {
        if (!target || typeof target.addEventListener !== 'function') {
          return Promise.resolve(null);
        }
        const timeoutMs =
          typeof reqOpts.timeoutMs === 'number' ? reqOpts.timeoutMs : defaultTimeoutMs;
        const requestId = `iv_story_${Date.now()}_${++seq}`;

        return new Promise((resolve) => {
          let settled = false;
          let timer = null;

          function finish(val) {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            target.removeEventListener('iv:storyUser', onResponse);
            resolve(val);
          }

          function onResponse(e) {
            const detail = e && e.detail;
            if (!detail || detail.requestId !== requestId) return;
            if (detail.username && detail.userId) {
              finish({ username: String(detail.username), userId: String(detail.userId) });
            } else {
              finish(null);
            }
          }

          target.addEventListener('iv:storyUser', onResponse);
          timer = setTimeout(() => finish(null), timeoutMs);

          const CustomEventCtor =
            opts.CustomEvent ||
            (typeof CustomEvent !== 'undefined'
              ? CustomEvent
              : function FallbackEvent(type, init) {
                  return { type, detail: init && init.detail };
                });

          target.dispatchEvent(
            new CustomEventCtor('iv:requestStoryUser', {
              detail: { requestId, username: username || '' },
            }),
          );
        });
      },
    };
  }

  function createStoryAcquisition(deps = {}) {
    const http = deps.http;
    const probe = deps.probe || null;
    const storage = deps.storage || {
      async getDocIds() {
        return {};
      },
    };
    const dom = deps.dom || {
      getOrigin: () => 'https://www.instagram.com',
      getHref: () => 'https://www.instagram.com/',
      getPathname: () => '/',
      getCookie: () => '',
      getWwwClaim: () => '0',
      getFbDtsg: () => '',
      setPreferredMediaResolutionCookies: () => {},
      getVisibleStoryMedia: () => ({ sourceUrl: '', posterUrl: '' }),
      findStoryToolbar: () => null,
      getProgressSegments: () => [],
    };
    const routeClassifier =
      deps.routeClassifier ||
      (root && root.classifyInstagramRoute) ||
      null;
    const logger = deps.logger || console;

    const userIdCache = new Map();

    if (probe && typeof probe.subscribe === 'function') {
      probe.subscribe((info) => {
        if (info && info.username && info.userId) {
          userIdCache.set(String(info.username).toLowerCase(), String(info.userId));
        }
      });
    }

    async function getDocId(friendlyName) {
      try {
        const map = (await storage.getDocIds()) || {};
        return map[friendlyName] || DEFAULT_DOC_IDS[friendlyName];
      } catch (_) {
        return DEFAULT_DOC_IDS[friendlyName];
      }
    }

    async function postGraphQL(friendlyName, variables) {
      if (typeof dom.setPreferredMediaResolutionCookies === 'function') {
        dom.setPreferredMediaResolutionCookies();
      }
      const docId = await getDocId(friendlyName);
      const csrf = typeof dom.getCookie === 'function' ? dom.getCookie('csrftoken') : '';
      const wwwClaim = typeof dom.getWwwClaim === 'function' ? dom.getWwwClaim() : '0';
      const fbDtsg = typeof dom.getFbDtsg === 'function' ? dom.getFbDtsg() : '';
      const origin = typeof dom.getOrigin === 'function' ? dom.getOrigin() : 'https://www.instagram.com';
      const href = typeof dom.getHref === 'function' ? dom.getHref() : `${origin}/`;

      const params = new URLSearchParams({
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName,
        doc_id: docId,
        variables: JSON.stringify(variables),
        server_timestamps: 'true',
      });
      if (fbDtsg) params.set('fb_dtsg', fbDtsg);

      const res = await http(`${origin}/graphql/query`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        referrer: href,
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
      if (!res || !res.ok) {
        throw new Error(`GraphQL ${friendlyName} failed (${res ? res.status : 'no response'})`);
      }
      return res.json();
    }

    async function getUserId(username) {
      if (!username) return null;
      const key = String(username).toLowerCase();
      if (userIdCache.has(key)) return userIdCache.get(key);

      // Request-correlated MAIN-world probe (resolves immediately on reply, no sleep race)
      if (probe && typeof probe.requestStoryUser === 'function') {
        try {
          const probed = await probe.requestStoryUser(username);
          if (probed && probed.username && probed.userId) {
            userIdCache.set(String(probed.username).toLowerCase(), String(probed.userId));
            if (userIdCache.has(key)) return userIdCache.get(key);
          }
        } catch (_) {}
      }

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
        const exact = users.find(
          (u) => u.user && u.user.username && u.user.username.toLowerCase() === key,
        );
        const id = String((exact || users[0]).user.id || (exact || users[0]).user.pk || '');
        if (id) userIdCache.set(key, id);
        return id || null;
      } catch (err) {
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[InstaVault StoryAcquisition] getUserId failed:', err);
        }
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
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[InstaVault StoryAcquisition] fetchUserStories failed:', err);
        }
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
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[InstaVault StoryAcquisition] fetchHighlight failed:', err);
        }
        return null;
      }
    }

    function extractUrlMediaId(pathname) {
      if (typeof routeClassifier === 'function') {
        const route = routeClassifier(pathname);
        if (route && (route.type === 'story' || route.type === 'highlight') && route.mediaId) {
          return route.mediaId;
        }
        return '';
      }
      const parts = String(pathname || '').split('/').filter(Boolean);
      return parts[0] === 'stories' && parts[1] !== 'highlights' && /^\d+$/.test(parts[2] || '')
        ? parts[2]
        : '';
    }

    function resolveCurrentSlide(items) {
      if (!Array.isArray(items) || !items.length) return null;
      if (items.length === 1) return items[0];

      // 1. Match by URL media ID (/stories/username/<mediaId>/)
      const pathname = typeof dom.getPathname === 'function' ? dom.getPathname() : '';
      const urlMediaId = extractUrlMediaId(pathname);
      if (urlMediaId) {
        const byId = items.find((it) => getMediaId(it.id) === urlMediaId);
        if (byId) return byId;
      }

      // 2. Match by rendered <img>/<video> ig_cache_key or pathname
      const vis =
        typeof dom.getVisibleStoryMedia === 'function'
          ? dom.getVisibleStoryMedia()
          : { sourceUrl: '', posterUrl: '' };
      for (const candidateUrl of [vis.sourceUrl, vis.posterUrl]) {
        if (!candidateUrl) continue;
        const cacheId = decodeMediaCacheId(candidateUrl);
        if (cacheId) {
          const hit = items.find(
            (it) =>
              getMediaId(it.id) === cacheId ||
              decodeMediaCacheId(it.url) === cacheId ||
              decodeMediaCacheId(it.previewUrl) === cacheId,
          );
          if (hit) return hit;
        }
        const p = getUrlPath(candidateUrl);
        if (p) {
          const hit = items.find(
            (it) => getUrlPath(it.url) === p || getUrlPath(it.previewUrl) === p,
          );
          if (hit) return hit;
        }
      }

      // 3. Match by active progress-bar segment index
      const segments =
        typeof dom.getProgressSegments === 'function'
          ? dom.getProgressSegments()
          : (() => {
              const toolbar =
                typeof dom.findStoryToolbar === 'function' ? dom.findStoryToolbar() : null;
              return toolbar && toolbar.previousElementSibling
                ? [...toolbar.previousElementSibling.children]
                : [];
            })();
      if (segments.length === items.length) {
        const activeIdx = segments.findIndex((seg) => seg && seg.childElementCount > 0);
        if (activeIdx >= 0 && activeIdx < items.length) return items[activeIdx];
      }

      return items[0];
    }

    return {
      getDocId,
      postGraphQL,
      getUserId,
      fetchUserStories,
      fetchHighlight,
      extractBestDash,
      normalizeReelItems,
      resolveCurrentSlide,
      findStoryToolbar: () => (typeof dom.findStoryToolbar === 'function' ? dom.findStoryToolbar() : null),
      setPreferredMediaResolutionCookies: () => {
        if (typeof dom.setPreferredMediaResolutionCookies === 'function') {
          dom.setPreferredMediaResolutionCookies();
        }
      },
      clearCache: () => userIdCache.clear(),
    };
  }

  const api = {
    IG_APP_ID,
    DEFAULT_DOC_IDS,
    parseDashManifest,
    selectBestRepresentation,
    extractBestDash,
    selectLargestProgressive,
    normalizeReelItems,
    getMediaId,
    decodeMediaCacheId,
    getUrlPath,
    createBrowserProbeAdapter,
    createStoryAcquisition,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultStoryAcquisition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

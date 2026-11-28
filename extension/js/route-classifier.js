/**
 * InstaVault Pure Instagram Route Classifier
 * Classifies Instagram URLs and pathnames into structured route descriptors
 * with zero DOM or window/location global dependencies.
 */
(function (root) {
  'use strict';

  const RESERVED_TOP_LEVEL_SEGMENTS = Object.freeze([
    'p',
    'reel',
    'reels',
    'tv',
    'stories',
    'explore',
    'direct',
    'accounts',
    'about',
    'developer',
    'legal',
    'privacy',
    'terms',
    'session',
    'challenge',
    'emails',
    'directory',
    'lite',
    'web',
    'graphql',
    'api',
    'static',
    'data',
    'download',
    'your_activity',
    'nametag',
    'create',
    'oauth',
    'login',
    'signup',
    'logout',
  ]);

  const RESERVED_SET = new Set(RESERVED_TOP_LEVEL_SEGMENTS);

  const SHORTCODE_ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  const USER_ROUTE_TYPES = new Set([
    'profile',
    'profile_reels',
    'profile_tagged',
    'profile_saved',
    'profile_saved_all',
    'profile_saved_collection',
  ]);

  const SAVED_ROUTE_TYPES = new Set([
    'profile_saved',
    'profile_saved_all',
    'profile_saved_collection',
  ]);

  const EXPLORE_ROUTE_TYPES = new Set([
    'explore',
    'explore_location',
    'explore_tag',
    'explore_search',
  ]);

  function parseInputUrl(urlOrPath) {
    if (typeof urlOrPath !== 'string') {
      return { pathname: '/', searchParams: new URLSearchParams(), search: '', hash: '' };
    }
    const trimmed = urlOrPath.trim();
    if (!trimmed) {
      return { pathname: '/', searchParams: new URLSearchParams(), search: '', hash: '' };
    }

    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
      const relative = trimmed.startsWith('/') ? trimmed.replace(/^\/+/, '/') : `/${trimmed}`;
      const parsed = hasScheme
        ? new URL(trimmed)
        : new URL(relative, 'https://www.instagram.com');
      return {
        pathname: parsed.pathname.replace(/\/+/g, '/'),
        searchParams: parsed.searchParams,
        search: parsed.search || '',
        hash: parsed.hash || '',
      };
    } catch (_) {
      const hashIdx = trimmed.indexOf('#');
      const noHash = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
      const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';
      const qIdx = noHash.indexOf('?');
      const rawPath = qIdx >= 0 ? noHash.slice(0, qIdx) : noHash;
      const search = qIdx >= 0 ? noHash.slice(qIdx) : '';
      const normalizedPath = (rawPath.startsWith('/') ? rawPath : `/${rawPath}`).replace(/\/+/g, '/');
      return {
        pathname: normalizedPath,
        searchParams: new URLSearchParams(search),
        search,
        hash,
      };
    }
  }

  function makeRoute(fields) {
    return Object.assign(
      {
        type: 'unknown',
        username: null,
        shortcode: null,
        highlightId: null,
        mediaId: null,
        audioId: null,
        locationId: null,
        collectionId: null,
        isReserved: false,
        pathname: '/',
        segments: [],
      },
      fields,
    );
  }

  /**
   * Pure classifier for Instagram URLs or pathnames.
   * @param {string} urlOrPath
   */
  function classifyInstagramRoute(urlOrPath) {
    const { pathname, searchParams } = parseInputUrl(urlOrPath);
    const segments = pathname.split('/').filter(Boolean);
    const first = segments[0] || '';
    const firstLower = first.toLowerCase();
    const isReserved = Boolean(first && RESERVED_SET.has(firstLower));

    // Root / home / past_posts timeline
    if (segments.length === 0) {
      if (searchParams.get('variant') === 'past_posts') {
        return makeRoute({ type: 'timeline', isReserved: false, pathname, segments });
      }
      return makeRoute({ type: 'home', isReserved: false, pathname, segments });
    }

    // /p/<shortcode>/
    if (firstLower === 'p') {
      if (segments[1]) {
        return makeRoute({
          type: 'post',
          shortcode: segments[1],
          isReserved: true,
          pathname,
          segments,
        });
      }
      return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
    }

    // /reel/<shortcode>/
    if (firstLower === 'reel') {
      if (segments[1]) {
        return makeRoute({
          type: 'reel',
          shortcode: segments[1],
          isReserved: true,
          pathname,
          segments,
        });
      }
      return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
    }

    // /tv/<shortcode>/
    if (firstLower === 'tv') {
      if (segments[1]) {
        return makeRoute({
          type: 'post',
          shortcode: segments[1],
          isReserved: true,
          pathname,
          segments,
        });
      }
      return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
    }

    // /reels/audio/<audioId>/ or /reels/[<shortcode>/]
    if (firstLower === 'reels') {
      if (segments[1] && segments[1].toLowerCase() === 'audio' && segments[2]) {
        return makeRoute({
          type: 'reels_audio',
          audioId: segments[2],
          isReserved: true,
          pathname,
          segments,
        });
      }
      return makeRoute({
        type: 'reels_feed',
        shortcode: segments[1] || null,
        isReserved: true,
        pathname,
        segments,
      });
    }

    // /stories/highlights/<highlightId>/[<mediaId>/] or /stories/<user>/[<mediaId>/]
    if (firstLower === 'stories') {
      if (segments[1] && segments[1].toLowerCase() === 'highlights') {
        if (segments[2] && /^\d+$/.test(segments[2])) {
          return makeRoute({
            type: 'highlight',
            highlightId: segments[2],
            mediaId: segments[3] && /^\d+$/.test(segments[3]) ? segments[3] : null,
            isReserved: true,
            pathname,
            segments,
          });
        }
        return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
      }
      if (segments[1]) {
        return makeRoute({
          type: 'story',
          username: segments[1],
          mediaId: segments[2] && /^\d+$/.test(segments[2]) ? segments[2] : null,
          isReserved: true,
          pathname,
          segments,
        });
      }
      return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
    }

    // /explore/...
    if (firstLower === 'explore') {
      if (segments.length === 1) {
        return makeRoute({ type: 'explore', isReserved: true, pathname, segments });
      }
      const secondLower = segments[1].toLowerCase();
      if (secondLower === 'locations') {
        const locationId = segments[2] && /^\d+$/.test(segments[2]) ? segments[2] : null;
        return makeRoute({
          type: 'explore_location',
          locationId,
          isReserved: true,
          pathname,
          segments,
        });
      }
      if (secondLower === 'tags' && segments[2]) {
        return makeRoute({ type: 'explore_tag', isReserved: true, pathname, segments });
      }
      if (secondLower === 'search') {
        return makeRoute({ type: 'explore_search', isReserved: true, pathname, segments });
      }
      return makeRoute({ type: 'explore', isReserved: true, pathname, segments });
    }

    // Any other reserved top-level path (/direct/, /accounts/, etc.)
    if (isReserved) {
      return makeRoute({ type: 'reserved', isReserved: true, pathname, segments });
    }

    // User-scoped routes: /<username>/...
    const username = first;
    if (segments.length === 1) {
      return makeRoute({ type: 'profile', username, isReserved: false, pathname, segments });
    }

    const sub = segments[1].toLowerCase();

    // /<username>/p/<shortcode>/ or /<username>/tv/<shortcode>/
    if ((sub === 'p' || sub === 'tv') && segments[2]) {
      return makeRoute({
        type: 'post',
        username,
        shortcode: segments[2],
        isReserved: false,
        pathname,
        segments,
      });
    }

    // /<username>/reel/<shortcode>/
    if (sub === 'reel' && segments[2]) {
      return makeRoute({
        type: 'reel',
        username,
        shortcode: segments[2],
        isReserved: false,
        pathname,
        segments,
      });
    }

    // /<username>/reels/
    if (sub === 'reels') {
      return makeRoute({
        type: 'profile_reels',
        username,
        shortcode: segments[2] || null,
        isReserved: false,
        pathname,
        segments,
      });
    }

    // /<username>/tagged/
    if (sub === 'tagged') {
      return makeRoute({ type: 'profile_tagged', username, isReserved: false, pathname, segments });
    }

    // /<username>/saved/...
    if (sub === 'saved') {
      if (segments.length === 2) {
        return makeRoute({ type: 'profile_saved', username, isReserved: false, pathname, segments });
      }
      if (segments[2].toLowerCase() === 'all-posts') {
        return makeRoute({
          type: 'profile_saved_all',
          username,
          isReserved: false,
          pathname,
          segments,
        });
      }
      if (segments[3] && /^\d+$/.test(segments[3])) {
        return makeRoute({
          type: 'profile_saved_collection',
          username,
          collectionId: segments[3],
          isReserved: false,
          pathname,
          segments,
        });
      }
      return makeRoute({ type: 'profile_saved', username, isReserved: false, pathname, segments });
    }

    // /<username>/guide/... or /<username>/guides/...
    if (sub === 'guide' || sub === 'guides') {
      return makeRoute({ type: 'guide', username, isReserved: false, pathname, segments });
    }

    return makeRoute({ type: 'profile', username, isReserved: false, pathname, segments });
  }

  /**
   * Decodes an Instagram media shortcode into its numeric PK string using BigInt.
   * Extended (>28 char) shortcodes have their 28-char suffix stripped before decoding.
   * @param {string} shortcode
   * @returns {string|null}
   */
  function shortcodeToPk(shortcode) {
    if (typeof shortcode !== 'string' || !shortcode.length) {
      return null;
    }
    let code = shortcode;
    if (code.length > 28) {
      code = code.slice(0, code.length - 28);
    }
    let pk = BigInt(0);
    for (const ch of code) {
      const idx = SHORTCODE_ALPHABET.indexOf(ch);
      if (idx < 0) return null;
      pk = pk * BigInt(64) + BigInt(idx);
    }
    return pk.toString();
  }

  /**
   * Computes canonical page predicates and UI/download capabilities for a classified route or URL.
   * @param {object|string} routeOrUrl
   */
  function getRouteCapabilities(routeOrUrl) {
    const route =
      typeof routeOrUrl === 'string'
        ? classifyInstagramRoute(routeOrUrl)
        : routeOrUrl || makeRoute({});
    const type = route.type || 'unknown';
    const pathname = route.pathname || '/';

    const isHome = type === 'home';
    const isTimeline = type === 'timeline';
    const isHomeOrTimeline = isHome || isTimeline;
    const isPost = type === 'post';
    const isReel = type === 'reel';
    const isPostOrReel = isPost || isReel;
    const isReelsFeed = type === 'reels_feed';
    const isReelsAudio = type === 'reels_audio';
    const isStory = type === 'story';
    const isHighlight = type === 'highlight';
    const isStoryOrHighlight = isStory || isHighlight;
    const isGuide = type === 'guide';

    const isUserProfile = type === 'profile';
    const isUserReels = type === 'profile_reels';
    const isUserTagged = type === 'profile_tagged';
    const isSavedPreview = type === 'profile_saved';
    const isSavedAll = type === 'profile_saved_all';
    const isSavedCollection = type === 'profile_saved_collection';
    const isSaved = SAVED_ROUTE_TYPES.has(type);
    const isUserRoute = USER_ROUTE_TYPES.has(type);

    const isExplore = EXPLORE_ROUTE_TYPES.has(type);
    const isExploreLocationSubtab =
      type === 'explore_location' && /\/(nearby|recent)\/?$/.test(pathname);
    const isExploreLocation = type === 'explore_location' && !isExploreLocationSubtab;
    const isExploreTag = type === 'explore_tag';
    const isExploreSearch = type === 'explore_search';
    const isExploreGeneric =
      type === 'explore' || isExploreSearch || isExploreLocationSubtab;

    const canFilterByDate =
      isUserProfile || isUserReels || isUserTagged || isExploreLocation || isExploreTag;
    const canFilterByAmount =
      canFilterByDate || isSavedAll || isSavedCollection || isReelsAudio;
    const canMarkItems =
      !isGuide && !isStoryOrHighlight && type !== 'reserved' && type !== 'unknown';

    return {
      type,
      isHome,
      isTimeline,
      isHomeOrTimeline,
      isPost,
      isReel,
      isPostOrReel,
      isReelsFeed,
      isReelsAudio,
      isStory,
      isHighlight,
      isStoryOrHighlight,
      isGuide,
      isUserProfile,
      isUserReels,
      isUserTagged,
      isSaved,
      isSavedPreview,
      isSavedAll,
      isSavedCollection,
      isUserRoute,
      isExplore,
      isExploreLocation,
      isExploreTag,
      isExploreSearch,
      isExploreGeneric,
      canFilterByDate,
      canFilterByAmount,
      canMarkItems,
    };
  }

  const api = {
    RESERVED_TOP_LEVEL_SEGMENTS,
    classifyInstagramRoute,
    shortcodeToPk,
    getRouteCapabilities,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultRoutes = api;
    root.classifyInstagramRoute = classifyInstagramRoute;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

/**
 * InstaVault Instagram Feed Fetcher
 * Deep module consolidating all 16 active Instagram feed/post/profile/reels/saved
 * fetch handlers and media-candidate normalization behind injectable adapters
 * ({ http, cookies, storage, sleep, i18n }) with per-request retry/backoff.
 */
(function (root) {
  'use strict';

  const DEFAULT_IG_APP_ID = '936619743392459';
  const DEFAULT_ASBD_ID = '219994';
  const DEFAULT_WWW_CLAIM = '0';
  const DEFAULT_TAG_POSTS_QUERY_HASH = 'be13233562af2d229b008d2976b998b5';
  const DEFAULT_BACKOFF_BASE_MS = 1500;
  const DEFAULT_MAX_BACKOFF_MULTIPLIER = 5;

  const FILE_EXT_IMAGE = 'jpg';
  const FILE_EXT_VIDEO = 'mp4';

  const HEADER_NAMES = Object.freeze({
    APP_ID: 'x-ig-app-id',
    ASBD_ID: 'x-asbd-id',
    WWW_CLAIM: 'x-ig-www-claim',
    CSRF_TOKEN: 'x-csrftoken',
    IG_AJAX: 'x-instagram-ajax',
    REQUESTED_WITH: 'x-requested-with',
  });

  /**
   * Sorts media candidates so the highest-resolution non-square candidate comes first,
   * preserving legacy comparator semantics.
   */
  function compareMediaCandidates(a, b) {
    const aWidth = a.width || a.config_width || null;
    const bWidth = b.width || b.config_width || null;
    const aHeight = a.height || a.config_height || null;
    const bHeight = b.height || b.config_height || null;
    if (aWidth && bWidth && aWidth !== aHeight && bWidth !== bHeight) {
      if (aWidth !== bWidth) {
        return bWidth > aWidth ? 1 : -1;
      }
      return bHeight > aHeight ? 1 : -1;
    }
    return 0;
  }

  function pickBestCandidate(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const sorted = candidates.slice().sort(compareMediaCandidates);
    return sorted[0] || null;
  }

  function generateFallbackId() {
    const min = 1;
    const max = 9e9;
    return Math.floor(Math.random() * (1 + max - min)) + min;
  }

  function formatMediaItem(post, meta, getMessage) {
    const creationTime = meta.creationTime instanceof Date ? meta.creationTime : new Date(0);
    const prefix = typeof getMessage === 'function' ? getMessage('massPrefix') : '';
    return {
      username: meta._userName,
      id: post.id || post.pk || generateFallbackId(),
      url: meta.url,
      fileExt: meta.fileExt,
      takenAt: meta.takenAt,
      collectionName: meta._collectionName || meta.collectionName || null,
      shortcode: meta.shortcode || meta.code || meta.id || meta.pk || null,
      y: creationTime.getFullYear().toString(),
      m: (creationTime.getMonth() + 1).toString().padStart(2, '0'),
      d: creationTime.getDate().toString().padStart(2, '0'),
      time: creationTime.toTimeString().slice(0, 8).replace(/:/g, ''),
      tm: new Date().getTime().toString(),
      dm: creationTime.toISOString().split('T')[0],
      q: `${meta.width}x${meta.height}`,
      desc: (post.caption && post.caption.text) || '',
      lc: post.like_count || null,
      pc: post.play_count || null,
      cc: post.comment_count || null,
      pt: meta.pageType,
      loc:
        (post.location && post.location.name) ||
        (post.location && post.location.short_name) ||
        (post.location && post.location.city) ||
        '',
      index: meta.index || null,
      prefix,
      isThumb: meta.isThumb || false,
    };
  }

  function extractMediaItemsFromPost(apiResponse, req, getMessage) {
    if (!apiResponse || apiResponse.err || !apiResponse.items) {
      return { err: true };
    }
    const post = apiResponse.items[0] || null;
    if (!post) return { err: true };

    const results = [];
    const username = (post.owner && post.owner.username) || generateFallbackId();
    const collectionName = req.collectionName || null;
    const takenAt = post.taken_at || post.taken_at_timestamp || null;
    const creationTime = takenAt ? new Date(1000 * parseInt(takenAt, 10)) : null;

    function pushVideoWithOptionalThumb(node, index) {
      const bestVideo = pickBestCandidate(node.video_versions);
      if (!bestVideo) return;
      results.push(
        formatMediaItem(
          post,
          {
            _userName: username,
            url: bestVideo.src || bestVideo.url,
            width: bestVideo.width,
            height: bestVideo.height,
            fileExt: FILE_EXT_VIDEO,
            takenAt,
            pageType: req.pageType,
            creationTime,
            index,
            collectionName,
          },
          getMessage,
        ),
      );
      if (req.toDwThumb && node.image_versions2 && node.image_versions2.candidates) {
        const bestThumb = pickBestCandidate(node.image_versions2.candidates);
        if (bestThumb) {
          results.push(
            formatMediaItem(
              post,
              {
                _userName: username,
                url: bestThumb.src || bestThumb.url,
                width: bestThumb.width,
                height: bestThumb.height,
                fileExt: FILE_EXT_IMAGE,
                takenAt,
                pageType: req.pageType,
                creationTime,
                index,
                collectionName,
                isThumb: true,
              },
              getMessage,
            ),
          );
        }
      }
    }

    function pushImage(node, index) {
      const bestImg = pickBestCandidate(node.image_versions2.candidates);
      if (!bestImg) return;
      results.push(
        formatMediaItem(
          post,
          {
            _userName: username,
            url: bestImg.src || bestImg.url,
            width: bestImg.width,
            height: bestImg.height,
            fileExt: FILE_EXT_IMAGE,
            takenAt,
            pageType: req.pageType,
            creationTime,
            index,
            collectionName,
          },
          getMessage,
        ),
      );
    }

    if (Array.isArray(post.carousel_media)) {
      post.carousel_media.forEach((slide, idx) => {
        const oneBasedIndex = idx + 1;
        if (slide.video_versions) {
          pushVideoWithOptionalThumb(slide, oneBasedIndex);
        } else if (slide.image_versions2 && slide.image_versions2.candidates) {
          pushImage(slide, oneBasedIndex);
        }
      });
    } else if (post.video_versions) {
      pushVideoWithOptionalThumb(post, null);
    } else if (post.image_versions2 && post.image_versions2.candidates) {
      pushImage(post, null);
    } else {
      return { err: true };
    }

    return results;
  }

  function extractMediaFromSections(sections) {
    const mediaList = [];
    if (!Array.isArray(sections)) return mediaList;
    for (const section of sections) {
      if (
        section &&
        section.feed_type === 'media' &&
        section.layout_content &&
        Array.isArray(section.layout_content.medias) &&
        section.layout_content.medias.length
      ) {
        for (const item of section.layout_content.medias) {
          if (item && item.media) {
            mediaList.push(item.media);
          }
        }
      }
    }
    return mediaList;
  }

  function createChromeCookiesAdapter() {
    return {
      get(details) {
        return new Promise((resolve) => {
          if (typeof chrome === 'undefined' || !chrome.cookies || !chrome.cookies.get) {
            resolve(null);
            return;
          }
          try {
            chrome.cookies.get(details, (cookie) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve(null);
                return;
              }
              resolve(cookie || null);
            });
          } catch (_) {
            resolve(null);
          }
        });
      },
    };
  }

  function createChromeStorageAdapter() {
    return {
      get(key) {
        return new Promise((resolve) => {
          if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            resolve({});
            return;
          }
          try {
            chrome.storage.local.get(key, (result) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve({});
                return;
              }
              resolve(result || {});
            });
          } catch (_) {
            resolve({});
          }
        });
      },
    };
  }

  function defaultSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function defaultGetMessage(key) {
    if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
      return chrome.i18n.getMessage(key);
    }
    return '';
  }

  function createInstagramFeedFetcher(options = {}) {
    const http =
      options.http || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const cookies = options.cookies || createChromeCookiesAdapter();
    const storage = options.storage || createChromeStorageAdapter();
    const sleep = options.sleep || defaultSleep;
    const getMessage = options.getMessage || defaultGetMessage;
    const backoffBaseMs =
      typeof options.backoffBaseMs === 'number' ? options.backoffBaseMs : DEFAULT_BACKOFF_BASE_MS;
    const maxBackoffMultiplier =
      typeof options.maxBackoffMultiplier === 'number'
        ? options.maxBackoffMultiplier
        : DEFAULT_MAX_BACKOFF_MULTIPLIER;

    let failedInSequenceCount = 0;

    async function getCsrfToken() {
      try {
        const cookie = await cookies.get({
          url: 'https://www.instagram.com',
          name: 'csrftoken',
        });
        return cookie && typeof cookie.value === 'string' && cookie.value ? cookie.value : null;
      } catch (_) {
        return null;
      }
    }

    async function buildAuthHeaders(extraHeaders) {
      const stored = (await storage.get('instaHeaders')) || {};
      const harvested = (stored && stored.instaHeaders) || {};
      const csrf = await getCsrfToken();
      if (!csrf) {
        throw 'no_token';
      }
      return Object.assign(
        {
          [HEADER_NAMES.APP_ID]: harvested[HEADER_NAMES.APP_ID] || DEFAULT_IG_APP_ID,
          [HEADER_NAMES.ASBD_ID]: harvested[HEADER_NAMES.ASBD_ID] || DEFAULT_ASBD_ID,
          [HEADER_NAMES.WWW_CLAIM]: harvested[HEADER_NAMES.WWW_CLAIM] || DEFAULT_WWW_CLAIM,
          [HEADER_NAMES.CSRF_TOKEN]: csrf,
        },
        extraHeaders || {},
      );
    }

    async function getQueryHashes() {
      const stored = (await storage.get('instaQueryHash')) || {};
      return (stored && stored.instaQueryHash) || {};
    }

    async function fetchJson(url, init) {
      try {
        if (!http) throw new Error('No HTTP adapter configured');
        const res = await http(url, init);
        if (!res || res.status !== 200) {
          throw new Error('request error');
        }
        return await res.json();
      } catch (err) {
        return { err: true, text: err };
      }
    }

    /**
     * Per-request linear backoff retry loop (isolated per call; no shared mutable timer).
     */
    async function fetchJsonWithBackoff(url, init) {
      let delayMs = backoffBaseMs;
      const maxDelayMs = backoffBaseMs * maxBackoffMultiplier;
      while (true) {
        await sleep(delayMs);
        try {
          if (!http) throw new Error('No HTTP adapter configured');
          const res = await http(url, init);
          if (!res || res.status !== 200) {
            if (res && typeof res.text === 'function') {
              res.text().catch(() => {});
            }
            throw new Error(`request err _ ${res ? res.status : 'unknown'}`);
          }
          return await res.json();
        } catch (_) {
          if (delayMs > maxDelayMs) {
            return { err: true };
          }
          delayMs += backoffBaseMs;
        }
      }
    }

    async function withAuthHeaders(extraHeaders, fn) {
      try {
        const headers = await buildAuthHeaders(extraHeaders);
        return await fn(headers);
      } catch (err) {
        return { err };
      }
    }

    // 1. get_post_info
    async function getPostInfo(req = {}) {
      if (!req.postId) return { err: 'no_post_id' };
      return withAuthHeaders(null, async (headers) => {
        const url = `https://i.instagram.com/api/v1/media/${req.postId}/info/`;
        const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
        if (!res || res.err || !res.items || !res.items.length) return { err: true };
        return res.items;
      });
    }

    // 2. get_explorer_basic_by_type
    async function getExplorerBasicByType(req = {}) {
      if (!req.searchId || !req.type) return { err: 'no_info_for_req' };
      return withAuthHeaders(null, async (headers) => {
        let query = '';
        if (req.type === 'tags') {
          query = encodeURIComponent(`tag_name=${req.searchId}`);
        } else if (req.type === 'locations') {
          query = encodeURIComponent(`location_id=${req.searchId}`);
        }
        const url = `https://i.instagram.com/api/v1/${req.type}/web_info/?${query}`;
        const res = await fetchJson(url, { method: 'GET', headers });
        if (!res || res.err) return { err: true };

        const container = res.data || res.native_location_data || null;
        if (!container) return { err: true };

        let maxId = null;
        let pageNum = null;
        if (container.recent && container.recent.more_available) {
          maxId = container.recent.next_max_id || null;
          pageNum = container.recent.next_page || null;
        }

        let sections = [];
        const topOrRanked =
          (container.top && container.top.sections) ||
          (container.ranked && container.ranked.sections) ||
          null;
        if (topOrRanked) sections = sections.concat(topOrRanked);
        if (container.recent && container.recent.sections) {
          sections = sections.concat(container.recent.sections);
        }

        return {
          infoToDownload: extractMediaFromSections(sections),
          maxId,
          pageNum,
        };
      });
    }

    // 3. get_explorer_scroll_by_type (Bug fix: uses POST instead of GET with body)
    async function getExplorerScrollByType(req = {}) {
      if (!req.searchId || !req.maxId || req.pageNum === null || req.pageNum === undefined || !req.type) {
        return { err: 'no_scroll_info' };
      }
      return withAuthHeaders(
        {
          [HEADER_NAMES.IG_AJAX]: DEFAULT_IG_APP_ID,
          [HEADER_NAMES.REQUESTED_WITH]: 'XMLHttpRequest',
        },
        async (headers) => {
          const body = new URLSearchParams({
            include_persistent: 0,
            max_id: req.maxId,
            page: req.pageNum,
            surface: 'grid',
            tab: 'recent',
          });
          const url = `https://i.instagram.com/api/v1/${req.type}/${req.searchId}/sections/`;
          const res = await fetchJsonWithBackoff(url, { method: 'POST', headers, body });
          if (!res || res.err || !res.sections) return { err: true };

          let maxId = null;
          let nextPage = null;
          if (res.more_available) {
            maxId = res.next_max_id || null;
            nextPage = res.next_page || null;
          }

          return {
            feedInfo: extractMediaFromSections(res.sections),
            maxId,
            nextPage,
          };
        },
      );
    }

    // 4. get_media_from_post (Removed broken undeclared queryHash retry branch)
    async function getMediaFromPost(req = {}) {
      if (!req.pk) return { err: 'empty_pk' };
      if (failedInSequenceCount > 3) return { err: true };

      return withAuthHeaders(null, async (headers) => {
        const url = `https://www.instagram.com/api/v1/media/${req.pk}/info/`;
        const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
        if (!res || res.err) {
          failedInSequenceCount++;
          return { err: 'empty_response' };
        }
        failedInSequenceCount = 0;
        return extractMediaItemsFromPost(res, req, getMessage);
      });
    }

    // 5. get_reels_posts
    async function getReelsPosts(req = {}) {
      if (!req.userId) return { err: 'no_userId' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          let body = `target_user_id=${req.userId}&page_size=12&include_feed_video=true`;
          if (req.maxId) body += `&max_id=${req.maxId}`;
          const url = 'https://i.instagram.com/api/v1/clips/user/';
          const res = await fetchJsonWithBackoff(url, { method: 'POST', headers, body });
          if (!res || res.err || !res.items) return { err: true };

          const maxId =
            res.paging_info && res.paging_info.max_id !== undefined
              ? res.paging_info.max_id
              : null;
          const hasNextPage =
            res.paging_info && res.paging_info.more_available !== undefined
              ? res.paging_info.more_available
              : false;
          return { maxId, hasNextPage, feedInfo: res.items };
        },
      );
    }

    // 6. get_reels_audio
    async function getReelsAudio(req = {}) {
      if (!req.audioId) return { err: 'no_audio_id' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const params = {
            audio_cluster_id: req.audioId,
            original_sound_audio_asset_id: req.audioId,
          };
          if (req.maxId) params.max_id = req.maxId;
          const body = new URLSearchParams(params).toString();
          const url = 'https://i.instagram.com/api/v1/clips/music/';
          const res = await fetchJsonWithBackoff(url, { method: 'POST', headers, body });
          if (!res || res.err) return { err: true };

          return {
            maxId: (res.paging_info && res.paging_info.max_id) || null,
            hasNextPage: (res.paging_info && res.paging_info.more_available) || null,
            feedCnt: (res.media_count && res.media_count.clips_count) || null,
            feedInfo: res.items || null,
          };
        },
      );
    }

    // 7. get_user_highlights_list (Bug fix: removed stray trailing quote in query_id URL)
    async function getUserHighlightsList(req = {}) {
      if (!req.userId) return { err: 'empty_user_id' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const queryHashes = await getQueryHashes();
          let url = null;
          if (queryHashes.forHighlightsListId) {
            url = `https://www.instagram.com/graphql/query/?query_id=${queryHashes.forHighlightsListId}&user_id=${req.userId}&include_chaining=false&include_reel=true&include_suggested_users=false&include_logged_out_extras=false&include_live_status=false&include_highlight_reels=true`;
          } else if (queryHashes.forHighlightsList) {
            const variables = encodeURIComponent(
              JSON.stringify({
                user_id: req.userId,
                include_chaining: true,
                include_reel: true,
                include_suggested_users: false,
                include_logged_out_extras: false,
                include_highlight_reels: true,
                include_live_status: true,
              }),
            );
            url = `https://www.instagram.com/graphql/query/?query_hash=${queryHashes.forHighlightsList}&variables=${variables}`;
          } else {
            return { err: 'no_queryhash' };
          }

          const res = await fetchJson(url, { method: 'GET', headers });
          const edges =
            res &&
            res.data &&
            res.data.user &&
            res.data.user.edge_highlight_reels &&
            res.data.user.edge_highlight_reels.edges;
          if (!Array.isArray(edges) || !edges.length) return { err: true };

          const ids = [];
          for (const edge of edges) {
            if (edge && edge.node && edge.node.id) ids.push(edge.node.id);
          }
          return ids;
        },
      );
    }

    // 8. get_reels_tray_info
    async function getReelsTrayInfo() {
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const url = 'https://i.instagram.com/api/v1/feed/reels_tray/';
          return fetchJson(url, { method: 'GET', headers });
        },
      );
    }

    // 9. get_user_info
    async function getUserInfo(req = {}) {
      if (!req.userName) return { err: true };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${req.userName}`;
          const res = await fetchJson(url, { method: 'GET', headers });
          if (!res || res.err) return { err: true };

          const user = res.data && res.data.user;
          if (req.rawData && user) {
            return { userInfo: user };
          }
          const timeline = user && user.edge_owner_to_timeline_media;
          const pageInfo = timeline && timeline.page_info;
          if (
            !user ||
            !user.id ||
            !pageInfo ||
            pageInfo.end_cursor === undefined ||
            pageInfo.has_next_page === undefined
          ) {
            return { err: true };
          }

          return {
            endCursor: pageInfo.end_cursor,
            hasNextPage: pageInfo.has_next_page,
            userId: user.id,
            userName: user.username,
            postsAmount: timeline.count,
            postsFeedInfo: timeline.edges,
          };
        },
      );
    }

    // 10. get_user_saved_posts
    async function getUserSavedPosts(req = {}) {
      if (!req.endCursor || !req.userId) return { err: 'no_end_cursor' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const queryHashes = await getQueryHashes();
          if (!queryHashes.forUserSavedPosts) return { err: 'no_query_hash' };
          const variables = encodeURIComponent(
            JSON.stringify({
              id: req.userId,
              first: '12',
              after: req.endCursor,
            }),
          );
          const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHashes.forUserSavedPosts}&variables=${variables}`;
          return fetchJsonWithBackoff(url, { method: 'GET', headers });
        },
      );
    }

    // 11. get_user_saved_collection_base_info
    async function getUserSavedCollectionBaseInfo() {
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const params = new URLSearchParams({
            collection_types: JSON.stringify(['ALL_MEDIA_AUTO_COLLECTION', 'MEDIA']),
            include_public_only: 0,
          });
          const url = `https://www.instagram.com/api/v1/collections/list/?${params}`;
          const res = await fetchJson(url, { method: 'GET', headers });
          if (!res || res.err || !res.items) return { err: true };

          return res.items.map((item) => ({
            collection_id: item.collection_id,
            collection_name: item.collection_name,
            feed_posts_count: item.collection_media_count,
          }));
        },
      );
    }

    // 12. get_user_saved_collection_posts
    async function getUserSavedCollectionPosts(req = {}) {
      if (!req.collectionId) return { err: 'no_collection_id' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          let url = `https://www.instagram.com/api/v1/feed/collection/${req.collectionId}/posts/?max_id=`;
          if (req.endCursor) url += req.endCursor;
          const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
          if (!res || res.err || !Array.isArray(res.items)) return { err: true };

          const maxId = res.next_max_id || null;
          return { maxId, hasNextPage: Boolean(maxId), feedInfo: res.items };
        },
      );
    }

    // 13. get_user_saved_posts_alt
    async function getUserSavedPostsAlt(req = {}) {
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          let url = 'https://www.instagram.com/api/v1/feed/saved/posts/?max_id=';
          if (req.endCursor) url += req.endCursor;
          const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
          if (!res || res.err || !Array.isArray(res.items)) return { err: true };

          const maxId = res.next_max_id || null;
          return { maxId, hasNextPage: Boolean(maxId), feedInfo: res.items };
        },
      );
    }

    // 14. get_user_tag_posts
    async function getUserTagPosts(req = {}) {
      if (!req.userId) return { err: 'no_userId' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const queryHashes = await getQueryHashes();
          const hash = queryHashes.forUserTagPosts || DEFAULT_TAG_POSTS_QUERY_HASH;
          if (!hash) return { err: true };

          const vars = { id: req.userId, first: '12' };
          if (req.maxId) vars.after = req.maxId;
          const url = `https://www.instagram.com/graphql/query/?query_hash=${hash}&variables=${encodeURIComponent(
            JSON.stringify(vars),
          )}`;
          const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
          const tagged = res && res.data && res.data.user && res.data.user.edge_user_to_photos_of_you;
          if (!res || res.err || !tagged || !tagged.edges) return { err: true };

          const pageInfo = tagged.page_info;
          return {
            maxId: pageInfo && pageInfo.end_cursor !== undefined ? pageInfo.end_cursor : null,
            hasNextPage:
              pageInfo && pageInfo.has_next_page !== undefined ? pageInfo.has_next_page : false,
            feedInfo: tagged.edges,
          };
        },
      );
    }

    // 15. get_user_posts
    async function getUserPosts(req = {}) {
      if (!req.userId) return { err: 'no_userid' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          const queryHashes = await getQueryHashes();
          if (!queryHashes.forUserAllPosts) return { err: true };
          const variables = encodeURIComponent(
            JSON.stringify({
              id: req.userId,
              first: '12',
              after: req.endCursor,
            }),
          );
          const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHashes.forUserAllPosts}&variables=${variables}`;
          const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
          const timeline =
            res && res.data && res.data.user && res.data.user.edge_owner_to_timeline_media;
          if (!res || res.err || !timeline || !timeline.edges || !timeline.page_info) {
            return { err: true };
          }

          return {
            maxId:
              timeline.page_info.end_cursor !== undefined ? timeline.page_info.end_cursor : null,
            hasNextPage:
              timeline.page_info.has_next_page !== undefined
                ? timeline.page_info.has_next_page
                : false,
            feedInfo: timeline.edges,
          };
        },
      );
    }

    // 16. get_user_posts_alt
    async function getUserPostsAlt(req = {}) {
      if (!req.userName) return { err: 'no_username' };
      return withAuthHeaders(
        { 'content-type': 'application/x-www-form-urlencoded' },
        async (headers) => {
          let url = `https://i.instagram.com/api/v1/feed/user/${req.userName}/username/?count=12`;
          if (req.endCursor) url += `&max_id=${req.endCursor}`;
          const res = await fetchJsonWithBackoff(url, { method: 'GET', headers });
          if (!res || res.err || !res.items) return { tryUserPost: true };

          return {
            maxId: res.next_max_id !== undefined ? res.next_max_id : null,
            hasNextPage: res.more_available !== undefined ? res.more_available : false,
            feedInfo: res.items,
          };
        },
      );
    }

    const handlers = Object.freeze({
      get_post_info: getPostInfo,
      get_explorer_basic_by_type: getExplorerBasicByType,
      get_explorer_scroll_by_type: getExplorerScrollByType,
      get_media_from_post: getMediaFromPost,
      get_reels_posts: getReelsPosts,
      get_reels_audio: getReelsAudio,
      get_user_highlights_list: getUserHighlightsList,
      get_reels_tray_info: getReelsTrayInfo,
      get_user_info: getUserInfo,
      get_user_saved_posts: getUserSavedPosts,
      get_user_saved_collection_base_info: getUserSavedCollectionBaseInfo,
      get_user_saved_collection_posts: getUserSavedCollectionPosts,
      get_user_saved_posts_alt: getUserSavedPostsAlt,
      get_user_tag_posts: getUserTagPosts,
      get_user_posts: getUserPosts,
      get_user_posts_alt: getUserPostsAlt,
    });

    return {
      getCsrfToken,
      buildAuthHeaders,
      fetchJson,
      fetchJsonWithBackoff,
      getPostInfo,
      getExplorerBasicByType,
      getExplorerScrollByType,
      getMediaFromPost,
      getReelsPosts,
      getReelsAudio,
      getUserHighlightsList,
      getReelsTrayInfo,
      getUserInfo,
      getUserSavedPosts,
      getUserSavedCollectionBaseInfo,
      getUserSavedCollectionPosts,
      getUserSavedPostsAlt,
      getUserTagPosts,
      getUserPosts,
      getUserPostsAlt,
      handlers,
    };
  }

  const api = {
    DEFAULT_IG_APP_ID,
    DEFAULT_ASBD_ID,
    DEFAULT_WWW_CLAIM,
    DEFAULT_TAG_POSTS_QUERY_HASH,
    DEFAULT_BACKOFF_BASE_MS,
    DEFAULT_MAX_BACKOFF_MULTIPLIER,
    FILE_EXT_IMAGE,
    FILE_EXT_VIDEO,
    HEADER_NAMES,
    compareMediaCandidates,
    pickBestCandidate,
    generateFallbackId,
    formatMediaItem,
    extractMediaItemsFromPost,
    extractMediaFromSections,
    createInstagramFeedFetcher,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultFeedFetcher = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

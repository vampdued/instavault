/**
 * InstaVault Hardened Instagram Request Harvester
 * Extracts Instagram auth headers, GraphQL query hashes, and doc_id mappings
 * from webRequest events with pure parsers, safe JSON parsing, tab/lastError
 * guards, and serialized storage updates to prevent lost concurrent writes.
 */
(function (root) {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    HEADERS: 'instaHeaders',
    QUERY_HASH: 'instaQueryHash',
    DOC_IDS: 'instaDocIds',
  });

  const HARVESTED_HEADER_NAMES = Object.freeze([
    'x-ig-www-claim',
    'x-ig-app-id',
    'x-asbd-id',
  ]);

  const HARVESTED_HEADER_SET = new Set(HARVESTED_HEADER_NAMES);
  const PROFILE_ROOT_RE = /instagram\.com\/([^/]+)\/$/;

  /**
   * Pure parser: extracts tracked Instagram request headers from webRequest header list.
   * Returns a plain object of lowercased header names -> values, or null if none matched.
   */
  function parseHarvestedHeaders(requestHeaders) {
    if (!Array.isArray(requestHeaders) || requestHeaders.length === 0) {
      return null;
    }
    const updates = {};
    let found = false;
    for (let i = 0; i < requestHeaders.length; i++) {
      const entry = requestHeaders[i];
      if (!entry || typeof entry.name !== 'string') continue;
      const lower = entry.name.toLowerCase();
      if (HARVESTED_HEADER_SET.has(lower)) {
        updates[lower] = entry.value;
        found = true;
      }
    }
    return found ? updates : null;
  }

  /**
   * Pure parser: safely parses GraphQL `variables` query param with fallback to URLSearchParams.
   */
  function parseGraphqlVariables(searchParams) {
    const rawVariables = searchParams.get('variables');
    if (rawVariables) {
      try {
        const parsed = JSON.parse(rawVariables);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (_) {
        // Fall through to URLSearchParams key/value parsing
      }
    }
    const fallback = {};
    for (const [key, value] of searchParams) {
      fallback[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
    return fallback;
  }

  /**
   * Pure parser: inspects a GraphQL GET/query webRequest for doc_id, query_hash, and query_id.
   */
  function parseGraphqlQueryRequest(details) {
    if (!details || typeof details.url !== 'string') return null;
    if (!details.initiator || !details.initiator.includes('instagram.com')) return null;

    let parsedUrl;
    try {
      parsedUrl = new URL(details.url);
    } catch (_) {
      return null;
    }

    const variables = parseGraphqlVariables(parsedUrl.searchParams);
    const queryHash = parsedUrl.searchParams.get('query_hash') || null;
    const docId = parsedUrl.searchParams.get('doc_id') || null;
    const friendlyName =
      (variables && variables.fb_api_req_friendly_name) ||
      parsedUrl.searchParams.get('fb_api_req_friendly_name') ||
      null;

    const docIdUpdate =
      docId && friendlyName ? { friendlyName: String(friendlyName), docId: String(docId) } : null;

    let highlightsListId = null;
    if (
      !queryHash &&
      variables &&
      variables.user_id !== undefined &&
      variables.include_chaining !== undefined &&
      variables.include_reel !== undefined &&
      variables.include_highlight_reels !== undefined &&
      variables.query_id !== undefined
    ) {
      highlightsListId = variables.query_id;
    }

    return {
      variables,
      queryHash,
      docIdUpdate,
      highlightsListId,
      needsTabUrl: Boolean(queryHash && variables),
    };
  }

  /**
   * Pure classifier: maps GraphQL variables + query_hash + tab URL to an instaQueryHash slot.
   */
  function classifyQueryHashUpdate(variables, queryHash, tabUrl) {
    if (!variables || !queryHash) return null;

    if (variables.child_comment_count !== undefined && variables.shortcode !== undefined) {
      return { key: 'forSinglePost', value: queryHash };
    }

    if (
      variables.user_id !== undefined &&
      variables.include_chaining !== undefined &&
      variables.include_reel !== undefined &&
      variables.include_highlight_reels !== undefined
    ) {
      return { key: 'forHighlightsList', value: queryHash };
    }

    if (variables.id !== undefined && variables.first !== undefined) {
      if (typeof tabUrl !== 'string' || !tabUrl) return null;
      if (tabUrl.includes('/saved/')) {
        return { key: 'forUserSavedPosts', value: queryHash };
      }
      if (tabUrl.includes('/tagged/')) {
        return { key: 'forUserTagPosts', value: queryHash };
      }
      if (tabUrl.includes('/guides/') || tabUrl.includes('/explore/')) {
        return null;
      }
      if (PROFILE_ROOT_RE.test(tabUrl)) {
        return { key: 'forUserAllPosts', value: queryHash };
      }
    }

    return null;
  }

  /**
   * Pure parser: extracts doc_id + fb_api_req_friendly_name from GraphQL POST formData.
   */
  function parseGraphqlFormBody(details) {
    const formData =
      details && details.requestBody && details.requestBody.formData
        ? details.requestBody.formData
        : null;
    if (!formData || !Array.isArray(formData.doc_id) || !Array.isArray(formData.fb_api_req_friendly_name)) {
      return null;
    }
    const docId = formData.doc_id[0];
    const friendlyName = formData.fb_api_req_friendly_name[0];
    if (!docId || !friendlyName) return null;
    return { friendlyName: String(friendlyName), docId: String(docId) };
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
      set(items) {
        return new Promise((resolve) => {
          if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            resolve();
            return;
          }
          try {
            chrome.storage.local.set(items, () => {
              void (chrome.runtime && chrome.runtime.lastError);
              resolve();
            });
          } catch (_) {
            resolve();
          }
        });
      },
    };
  }

  function createChromeTabsAdapter() {
    return {
      get(tabId) {
        return new Promise((resolve) => {
          if (
            typeof tabId !== 'number' ||
            tabId < 0 ||
            typeof chrome === 'undefined' ||
            !chrome.tabs ||
            typeof chrome.tabs.get !== 'function'
          ) {
            resolve(null);
            return;
          }
          try {
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve(null);
                return;
              }
              resolve(tab || null);
            });
          } catch (_) {
            resolve(null);
          }
        });
      },
    };
  }

  /**
   * Serializes read-modify-write storage updates per key so concurrent webRequest
   * events never clobber one another's writes.
   */
  function createSerializedStorageUpdater(storage) {
    const queues = new Map();

    function update(key, mutator) {
      const prev = queues.get(key) || Promise.resolve();
      const next = prev
        .catch(() => {})
        .then(async () => {
          const data = (await storage.get(key)) || {};
          const current =
            data[key] && typeof data[key] === 'object' ? Object.assign({}, data[key]) : {};
          const updated = mutator(current);
          if (!updated) return;
          await storage.set({ [key]: updated });
        });
      queues.set(key, next);
      return next;
    }

    function flush(key) {
      if (key) {
        return (queues.get(key) || Promise.resolve()).catch(() => {});
      }
      return Promise.all(Array.from(queues.values(), (p) => p.catch(() => {})));
    }

    return { update, flush };
  }

  function createRequestHarvester(options = {}) {
    const storage = options.storage || createChromeStorageAdapter();
    const tabs = options.tabs || createChromeTabsAdapter();
    const webRequest =
      options.webRequest || (typeof chrome !== 'undefined' ? chrome.webRequest : null);
    const updater = createSerializedStorageUpdater(storage);

    function recordHeaders(updates) {
      if (!updates) return Promise.resolve();
      return updater.update(STORAGE_KEYS.HEADERS, (current) => {
        let changed = false;
        for (const [k, v] of Object.entries(updates)) {
          if (current[k] !== v) {
            current[k] = v;
            changed = true;
          }
        }
        return changed ? current : null;
      });
    }

    function recordDocId(docIdUpdate) {
      if (!docIdUpdate) return Promise.resolve();
      return updater.update(STORAGE_KEYS.DOC_IDS, (current) => {
        if (current[docIdUpdate.friendlyName] === docIdUpdate.docId) return null;
        current[docIdUpdate.friendlyName] = docIdUpdate.docId;
        return current;
      });
    }

    function recordQueryHash(slotKey, value) {
      if (!slotKey || !value) return Promise.resolve();
      return updater.update(STORAGE_KEYS.QUERY_HASH, (current) => {
        if (current[slotKey] === value) return null;
        current[slotKey] = value;
        return current;
      });
    }

    function handleBeforeSendHeaders(details) {
      const updates = parseHarvestedHeaders(details && details.requestHeaders);
      if (updates) {
        recordHeaders(updates);
      }
    }

    function handleGraphqlBeforeSendHeaders(details) {
      const parsed = parseGraphqlQueryRequest(details);
      if (!parsed) return;

      if (parsed.docIdUpdate) {
        recordDocId(parsed.docIdUpdate);
      }

      if (parsed.needsTabUrl) {
        if (typeof details.tabId !== 'number' || details.tabId < 0) return;
        tabs.get(details.tabId).then((tab) => {
          if (!tab || !tab.url) return;
          const slot = classifyQueryHashUpdate(parsed.variables, parsed.queryHash, tab.url);
          if (slot) {
            recordQueryHash(slot.key, slot.value);
          }
        });
      } else if (parsed.highlightsListId) {
        recordQueryHash('forHighlightsListId', parsed.highlightsListId);
      }
    }

    function handleGraphqlBeforeRequest(details) {
      const docIdUpdate = parseGraphqlFormBody(details);
      if (docIdUpdate) {
        recordDocId(docIdUpdate);
      }
    }

    function attachListeners() {
      if (!webRequest) return false;
      const xhrFilter = {
        urls: ['*://*.instagram.com/*'],
        types: ['xmlhttprequest'],
      };
      const graphqlFilter = {
        urls: ['*://*.instagram.com/graphql/query/*'],
      };
      const headersExtraSpec = ['requestHeaders', 'extraHeaders'];

      webRequest.onBeforeSendHeaders.addListener(
        handleBeforeSendHeaders,
        xhrFilter,
        headersExtraSpec,
      );
      webRequest.onBeforeSendHeaders.addListener(
        handleGraphqlBeforeSendHeaders,
        graphqlFilter,
        headersExtraSpec,
      );
      webRequest.onBeforeRequest.addListener(handleGraphqlBeforeRequest, graphqlFilter, [
        'requestBody',
      ]);
      return true;
    }

    return {
      handleBeforeSendHeaders,
      handleGraphqlBeforeSendHeaders,
      handleGraphqlBeforeRequest,
      attachListeners,
      flush: updater.flush,
    };
  }

  const api = {
    STORAGE_KEYS,
    HARVESTED_HEADER_NAMES,
    parseHarvestedHeaders,
    parseGraphqlVariables,
    parseGraphqlQueryRequest,
    classifyQueryHashUpdate,
    parseGraphqlFormBody,
    createSerializedStorageUpdater,
    createRequestHarvester,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultRequestHarvester = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

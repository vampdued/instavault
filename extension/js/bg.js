/**
 * InstaVault MV3 Background Service Worker Coordinator
 * Synchronously registers webRequest, runtime, and tab navigation listeners on boot
 * and routes messages through a single unified dispatch table.
 */
if (typeof importScripts === 'function') {
  importScripts(
    '/js/route-classifier.js',
    '/js/daemon-client.js',
    '/js/instagram-request-harvester.js',
    '/js/instagram-feed-fetcher.js',
  );
}

(function (root) {
  'use strict';

  /**
   * Probes all other Instagram tabs to see if another tab currently has an active download.
   */
  function checkOtherTabsDownloading(sender, tabsApi) {
    const api = tabsApi || (typeof chrome !== 'undefined' ? chrome.tabs : null);
    if (!api || typeof api.query !== 'function' || typeof api.sendMessage !== 'function') {
      return Promise.resolve(false);
    }

    const currentTabId = sender && sender.tab ? sender.tab.id : null;
    return new Promise((resolve) => {
      api.query({ url: ['*://*.instagram.com/*'] }, (tabs) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        const probes = [];
        for (const tab of tabs || []) {
          if (currentTabId !== null && tab.id === currentTabId) continue;
          probes.push(
            new Promise((probeResolve, probeReject) => {
              api.sendMessage(tab.id, { message: 'isDownload' }, (response) => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                  probeReject(new Error('tab_error'));
                  return;
                }
                if (response && response.isDownload) {
                  probeResolve(true);
                } else {
                  probeReject(new Error('not_downloading'));
                }
              });
            }),
          );
        }

        if (probes.length === 0) {
          resolve(false);
          return;
        }

        Promise.any(probes)
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });
    });
  }

  /**
   * Handles chrome.tabs.onUpdated navigation notifications for Instagram tabs.
   */
  function createTabUpdateHandler({ classifyRoute, tabsApi } = {}) {
    const classifier =
      classifyRoute ||
      (typeof root.classifyInstagramRoute === 'function' ? root.classifyInstagramRoute : null);

    return function onTabUpdated(tabId, changeInfo, tab) {
      const api = tabsApi || (typeof chrome !== 'undefined' ? chrome.tabs : null);
      if (!api || !tab || !tab.url || !tab.url.includes('instagram') || !changeInfo || !changeInfo.url) {
        return true;
      }

      const route = classifier ? classifier(changeInfo.url) : null;
      const ignoreLastError = () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          return null;
        }
      };

      if (route && route.type === 'reels_feed' && route.shortcode) {
        api.sendMessage(
          tabId,
          { message: 'reelFeedScroll', url: changeInfo.url, shortcode: route.shortcode },
          ignoreLastError,
        );
        return true;
      }

      const pageName = (route && route.segments && route.segments[0]) || null;
      api.sendMessage(
        tabId,
        { message: 'url', pageName, url: changeInfo },
        ignoreLastError,
      );
      return true;
    };
  }

  /**
   * Builds the single unified chrome.runtime.onMessage handler covering:
   * - Daemon actions (`sync_start`, `download`)
   * - Cross-tab download lock probe (`get_download_status`)
   * - All 16 active Instagram feed fetcher routes
   */
  function createMessageRouter({ daemonClient, feedFetcher, checkDownloading } = {}) {
    const probeDownloading = checkDownloading || checkOtherTabsDownloading;
    const titleHandlers = (feedFetcher && feedFetcher.handlers) || {};

    return function handleRuntimeMessage(message, sender, sendResponse) {
      if (!message || typeof message !== 'object') {
        sendResponse(null);
        return false;
      }

      // Daemon action routes
      if (message.action === 'sync_start') {
        if (daemonClient && typeof daemonClient.notifySyncStart === 'function') {
          daemonClient.notifySyncStart(message.payload || {}).catch(() => {});
        }
        return false;
      }

      if (message.action === 'download' && message.payload) {
        if (!daemonClient || typeof daemonClient.dispatchDownload !== 'function') {
          sendResponse({ ok: false, error: 'Daemon client unavailable' });
          return false;
        }
        daemonClient
          .dispatchDownload(message.payload)
          .then((res) => sendResponse(res))
          .catch((err) => {
            sendResponse({
              ok: false,
              error: (err && err.message) || 'Background fetch failed',
            });
          });
        return true;
      }

      // Cross-tab download status probe
      if (message.title === 'get_download_status') {
        probeDownloading(sender)
          .then((isDownloading) => sendResponse(Boolean(isDownloading)))
          .catch(() => sendResponse(false));
        return true;
      }

      // Active Instagram feed fetcher routes
      if (message.title && Object.prototype.hasOwnProperty.call(titleHandlers, message.title)) {
        Promise.resolve()
          .then(() => titleHandlers[message.title](message))
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ err }));
        return true;
      }

      return undefined;
    };
  }

  // Synchronous MV3 service worker boot (never deferred behind async promises)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    const harvester =
      root.InstaVaultRequestHarvester &&
      root.InstaVaultRequestHarvester.createRequestHarvester();
    const feedFetcher =
      root.InstaVaultFeedFetcher && root.InstaVaultFeedFetcher.createInstagramFeedFetcher();
    const daemonClient =
      root.InstaVaultDaemonClient && root.InstaVaultDaemonClient.createDaemonClient();

    if (harvester) {
      harvester.attachListeners();
    }

    chrome.runtime.onMessage.addListener(
      createMessageRouter({ daemonClient, feedFetcher }),
    );
    chrome.runtime.onConnect.addListener(() => {});

    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener(createTabUpdateHandler());
    }

    try {
      console.log('[instavault] bg ready — unified coordinator (harvester + feed fetcher active)');
    } catch (_) {}
  }

  const api = {
    checkOtherTabsDownloading,
    createTabUpdateHandler,
    createMessageRouter,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.InstaVaultBackground = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

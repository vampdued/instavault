/**
 * InstaVault Extension-to-Daemon Client Bridge (Content Script)
 * Wires the unified InstaVaultDaemonClient over chrome.runtime.sendMessage for MV3
 * content scripts, delegates route parsing to InstaVaultRoutes, and maintains
 * bounded MV3 service worker keepalive reconnection.
 */
(() => {
  'use strict';

  function guessProfileFromPath(pathname) {
    if (typeof window.classifyInstagramRoute === 'function') {
      const route = window.classifyInstagramRoute(pathname || '');
      return route && route.username ? route.username : '';
    }
    return '';
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.id) {
        return reject(new Error('Extension context invalidated'));
      }
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response);
      });
    });
  }

  const daemon = window.InstaVaultDaemonClient.createDaemonClient({
    runtimeSyncStart(payload) {
      if (!chrome?.runtime?.id) return Promise.resolve({ ok: false });
      try {
        chrome.runtime.sendMessage({ action: 'sync_start', payload });
        return Promise.resolve({ ok: true });
      } catch (_) {
        return Promise.resolve({ ok: false });
      }
    },
    async runtimeDownload(payload) {
      const response = await sendRuntimeMessage({ action: 'download', payload });
      if (response && !response.ok) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: response.error || 'Background download failed',
        };
      }
      return response || { ok: true, data: null, error: null };
    },
  });

  function notifySyncStart(username, stage = 'preparing') {
    const targetUser = username || guessProfileFromPath(location.pathname);
    daemon.notifySyncStart({ username: targetUser, stage });
  }

  async function sendDownloadPayload(payload) {
    const res = await daemon.dispatchDownload(payload);
    if (!res || !res.ok) {
      throw new Error((res && res.error) || 'Background download failed');
    }
    return res;
  }

  function dispatchBatch(items, callbacks) {
    return daemon.dispatchBatch(items, callbacks);
  }

  function getDashboardUrl(hashPath = '') {
    return daemon.getDashboardUrl(hashPath);
  }

  // Bounded MV3 service-worker reconnect (prevents infinite error spam on extension reload/update)
  function startKeepAlive(maxRetries = 5) {
    let attempts = 0;
    let timer = null;

    function connect() {
      if (!chrome?.runtime?.id) return;
      try {
        const port = chrome.runtime.connect({ name: 'instavault-keepalive' });
        attempts = 0;
        port.onDisconnect.addListener(() => {
          if (!chrome?.runtime?.id) return;
          attempts++;
          if (attempts > maxRetries) return;
          const backoffMs = Math.min(30000, 500 * Math.pow(2, attempts - 1));
          clearTimeout(timer);
          timer = setTimeout(connect, backoffMs);
        });
      } catch (_) {
        // Extension context invalidated; stop reconnecting
      }
    }

    connect();
  }

  window.InstaVaultClient = {
    guessProfileFromPath,
    notifySyncStart,
    sendDownloadPayload,
    dispatchBatch,
    getDashboardUrl,
    startKeepAlive,
    daemon,
  };
})();

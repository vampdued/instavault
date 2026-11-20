/**
 * InstaVault Extension-to-Daemon Client Bridge
 * Owns sync_start signaling, sequential download dispatch with accurate progress & failure tracking,
 * and bounded MV3 service worker keepalive reconnection.
 */
(() => {
  'use strict';

  function guessProfileFromPath(pathname) {
    const parts = String(pathname || '').split('/').filter(Boolean);
    if (!parts.length) return '';
    if (parts[0] === 'stories' && parts[1] && parts[1] !== 'highlights') return parts[1];
    const reserved = ['p', 'reel', 'reels', 'explore', 'stories', 'direct', 'accounts'];
    return reserved.includes(parts[0]) ? '' : parts[0];
  }

  function notifySyncStart(username, stage = 'preparing') {
    if (!chrome?.runtime?.id) return;
    try {
      const targetUser = username || guessProfileFromPath(location.pathname);
      chrome.runtime.sendMessage({
        action: 'sync_start',
        payload: { username: targetUser, stage },
      });
    } catch (_) {
      // Ignore if extension context was invalidated
    }
  }

  function sendDownloadPayload(payload) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.id) {
        return reject(new Error('Extension context invalidated'));
      }
      chrome.runtime.sendMessage({ action: 'download', payload }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && !response.ok) {
          return reject(new Error(response.error || 'Background download failed'));
        }
        resolve(response);
      });
    });
  }

  async function dispatchBatch(items, { buildFilename, isCancelled, onProgress }) {
    const total = items.length;
    let current = 0;
    let failed = 0;

    for (const item of items) {
      if (isCancelled && isCancelled()) {
        return { cancelled: true, complete: false, notAllDw: failed > 0 };
      }

      const payload = {
        username: item.username || item.userName || 'instagram',
        accountId: item.id ? item.id.toString() : '',
        shortcode: item.shortcode || item.id || '',
        url: item.url,
        dashVideoUrl: item.dashVideoUrl || '',
        dashAudioUrl: item.dashAudioUrl || '',
        filename: buildFilename(item),
        fileExt: item.fileExt,
        takenAt: parseInt(item.takenAt, 10) || 0,
        isThumb: item.isThumb || false,
        pageType: item.pt || '',
        index: item.index || 0,
      };

      try {
        const res = await sendDownloadPayload(payload);
        if (res && res.data && res.data.status === 'error') {
          failed++;
        }
      } catch (err) {
        failed++;
        console.error('[InstaVault] Download failed via background service worker:', err);
      }

      current++;
      if (onProgress && (failed === 0 || current < total)) {
        onProgress((current / total) * 100);
      }
    }

    return { cancelled: false, complete: true, notAllDw: failed > 0 };
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
    startKeepAlive,
  };
})();

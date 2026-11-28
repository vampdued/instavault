/**
 * InstaVault Toolbar Popup Controller
 * Manages live daemon telemetry, connection health checks, theme state, and tab navigation
 * backed by the unified InstaVaultDaemonClient.
 */

(function () {
  'use strict';

  const POLL_INTERVAL_MS = 3000;
  const FETCH_TIMEOUT_MS = 2500;

  const daemon = window.InstaVaultDaemonClient.createDaemonClient({
    defaultTimeoutMs: FETCH_TIMEOUT_MS,
  });

  // DOM Elements
  const daemonStatus = document.getElementById('daemonStatus');
  const statusText = document.getElementById('statusText');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const onlineView = document.getElementById('onlineView');
  const offlineView = document.getElementById('offlineView');
  const activeSyncCard = document.getElementById('activeSyncCard');
  const activeSyncUser = document.getElementById('activeSyncUser');
  const extUpdateBanner = document.getElementById('extUpdateBanner');

  // Telemetry Elements
  const statTotalDownloads = document.getElementById('statTotalDownloads');
  const statUniqueAccounts = document.getElementById('statUniqueAccounts');
  const statTotalSkipped = document.getElementById('statTotalSkipped');
  const storageUsageRatio = document.getElementById('storageUsageRatio');
  const storageProgressBar = document.getElementById('storageProgressBar');
  const storageBarFill = document.getElementById('storageBarFill');
  const storageFreeText = document.getElementById('storageFreeText');
  const footerDir = document.getElementById('footerDir');

  // Action Buttons & Config
  const btnOpenVault = document.getElementById('btnOpenVault');
  const btnVaultPort = document.getElementById('btnVaultPort');
  const serverAddressDisplay = document.getElementById('serverAddressDisplay');
  const btnLaunchInstagram = document.getElementById('btnLaunchInstagram');
  const btnLaunchInstagramOffline = document.getElementById('btnLaunchInstagramOffline');
  const btnOpenSkipped = document.getElementById('btnOpenSkipped');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnChangeServer = document.getElementById('btnChangeServer');
  const btnChangeServerOffline = document.getElementById('btnChangeServerOffline');
  const btnRetryConnection = document.getElementById('btnRetryConnection');

  const serverEditorForm = document.getElementById('serverEditorForm');
  const serverUrlInput = document.getElementById('serverUrlInput');
  const btnCancelServer = document.getElementById('btnCancelServer');

  let pollTimer = null;
  let isChecking = false;

  function renderSyncBanner(sync) {
    if (!activeSyncCard) return;
    if (sync && sync.isActive) {
      activeSyncCard.classList.remove('hidden');
      const titleEl = activeSyncCard.querySelector('.sync-title');
      if (titleEl) titleEl.textContent = sync.stage === 'preparing' ? 'Preparing Media' : 'Saving Media';
      if (activeSyncUser) activeSyncUser.textContent = sync.username ? `@${sync.username}` : 'In progress…';
    } else {
      activeSyncCard.classList.add('hidden');
    }
  }

  function connectSSE() {
    daemon.connectEvents({
      onSync(data) {
        if (data && data.activeSync) {
          renderSyncBanner(data.activeSync);
        }
        if (data && data.latest && (data.latest.status === 'completed' || data.latest.status === 'skipped')) {
          checkDaemon();
        }
      },
    });
  }

  function updateServerDisplay() {
    const baseUrl = daemon.getCachedBaseUrl();
    try {
      const u = new URL(baseUrl);
      const portText = u.port ? `:${u.port}` : '';
      if (btnVaultPort) btnVaultPort.textContent = portText || ':19201';
      if (serverAddressDisplay) serverAddressDisplay.textContent = u.host || 'localhost:19201';
    } catch (_) {
      if (btnVaultPort) btnVaultPort.textContent = ':19201';
      if (serverAddressDisplay) serverAddressDisplay.textContent = baseUrl;
    }
  }

  function openServerEditor() {
    if (!serverEditorForm || !serverUrlInput) return;
    serverUrlInput.value = daemon.getCachedBaseUrl();
    serverEditorForm.classList.remove('hidden');
    serverUrlInput.focus();
    serverUrlInput.select();
  }

  function closeServerEditor() {
    if (!serverEditorForm) return;
    serverEditorForm.classList.add('hidden');
  }

  async function saveServerUrl(e) {
    if (e) e.preventDefault();
    if (!serverUrlInput) return;
    const raw = serverUrlInput.value.trim();
    if (!raw) return;
    closeServerEditor();
    await daemon.setBaseUrl(raw);
    updateServerDisplay();
    setStatus('checking', 'Connecting…');
    checkDaemon();
  }

  // =========================================================================
  // Helper: Open Tab in Chrome
  // =========================================================================
  function openUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  }

  // =========================================================================
  // Theme Manager
  // =========================================================================
  function isCurrentThemeLight() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light') return true;
    if (attr === 'dark') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  function updateThemeButtonTitle() {
    if (!themeToggleBtn) return;
    const isLight = isCurrentThemeLight();
    themeToggleBtn.setAttribute(
      'title',
      isLight ? 'Switch to dark theme' : 'Switch to light theme',
    );
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateThemeButtonTitle();
  }

  function initTheme() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['theme'], function (result) {
        if (result && (result.theme === 'light' || result.theme === 'dark')) {
          applyTheme(result.theme);
        } else {
          const localTheme = localStorage.getItem('instavault_theme');
          if (localTheme === 'light' || localTheme === 'dark') {
            applyTheme(localTheme);
          } else {
            updateThemeButtonTitle();
          }
        }
      });
    } else {
      const localTheme = localStorage.getItem('instavault_theme');
      if (localTheme === 'light' || localTheme === 'dark') {
        applyTheme(localTheme);
      } else {
        updateThemeButtonTitle();
      }
    }

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if (!document.documentElement.hasAttribute('data-theme')) {
          updateThemeButtonTitle();
        }
      });
    }
  }

  function toggleTheme() {
    const isLight = isCurrentThemeLight();
    const nextTheme = isLight ? 'dark' : 'light';
    applyTheme(nextTheme);

    try {
      localStorage.setItem('instavault_theme', nextTheme);
    } catch (_) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: nextTheme });
    }
  }

  // =========================================================================
  // Formatters
  // =========================================================================
  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString();
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  // =========================================================================
  // Telemetry Fetcher & Renderer
  // =========================================================================
  function setStatus(state, message) {
    if (!daemonStatus) return;
    daemonStatus.classList.remove('status-online', 'status-offline', 'status-checking');
    if (state === 'online') {
      daemonStatus.classList.add('status-online');
      if (statusText) statusText.textContent = message || 'Connected';
    } else if (state === 'offline') {
      daemonStatus.classList.add('status-offline');
      if (statusText) statusText.textContent = message || 'Offline';
    } else {
      daemonStatus.classList.add('status-checking');
      if (statusText) statusText.textContent = message || 'Checking…';
    }
  }

  async function checkDaemon() {
    if (isChecking) return;
    isChecking = true;

    try {
      const result = await daemon.pollHealth({ timeoutMs: FETCH_TIMEOUT_MS });
      if (result.online) {
        renderOnline(result.stats, result.settings);
        connectSSE();
      } else {
        console.warn('[InstaVault HUD] Daemon unreachable:', result.error);
        daemon.closeEvents();
        renderOffline(result.error);
      }
    } finally {
      isChecking = false;
    }
  }

  function renderOnline(stats, settings) {
    setStatus('online', 'Connected');

    if (onlineView) onlineView.classList.remove('hidden');
    if (offlineView) offlineView.classList.add('hidden');

    if (statTotalDownloads) statTotalDownloads.textContent = formatNumber(stats.totalDownloads);
    if (statUniqueAccounts) statUniqueAccounts.textContent = formatNumber(stats.uniqueAccounts);
    if (statTotalSkipped) statTotalSkipped.textContent = formatNumber(stats.totalSkipped);

    if (extUpdateBanner) {
      let extVer = '1.0.0';
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        extVer = chrome.runtime.getManifest().version || '1.0.0';
      }
      if (stats.minExtensionVersion && daemon.isVersionOutdated(extVer, stats.minExtensionVersion)) {
        extUpdateBanner.classList.remove('hidden');
      } else {
        extUpdateBanner.classList.add('hidden');
      }
    }

    renderSyncBanner(stats.activeSync);

    if (stats.diskTotal && stats.diskTotal > 0) {
      const total = stats.diskTotal;
      const free = stats.diskFree;
      const used = total - free;
      const usedPercent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));

      if (storageUsageRatio) storageUsageRatio.textContent = `${usedPercent}% used`;
      if (storageProgressBar) storageProgressBar.setAttribute('aria-valuenow', usedPercent);
      if (storageBarFill) storageBarFill.style.width = `${usedPercent}%`;
      if (storageFreeText) storageFreeText.textContent = `${formatBytes(free)} free of ${formatBytes(total)}`;
    } else {
      if (storageUsageRatio) storageUsageRatio.textContent = 'Ready';
      if (storageBarFill) storageBarFill.style.width = '100%';
      if (storageFreeText) storageFreeText.textContent = 'Storage telemetry unavailable';
    }

    if (footerDir) {
      if (settings && settings.baseDir) {
        footerDir.textContent = settings.baseDir;
        footerDir.title = `Vault Storage: ${settings.baseDir}`;
      } else {
        footerDir.textContent = 'Default folder';
      }
    }
  }

  function renderOffline() {
    setStatus('offline', 'Offline');

    if (onlineView) onlineView.classList.add('hidden');
    if (offlineView) offlineView.classList.remove('hidden');
    if (activeSyncCard) activeSyncCard.classList.add('hidden');

    if (footerDir) footerDir.textContent = 'App offline';
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================
  function bindEvents() {
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    if (btnOpenVault) btnOpenVault.addEventListener('click', () => openUrl(daemon.buildDashboardUrl()));
    if (btnLaunchInstagram) btnLaunchInstagram.addEventListener('click', () => openUrl('https://www.instagram.com'));
    if (btnLaunchInstagramOffline) btnLaunchInstagramOffline.addEventListener('click', () => openUrl('https://www.instagram.com'));

    if (btnOpenSkipped) btnOpenSkipped.addEventListener('click', () => openUrl(daemon.buildDashboardUrl('#skipped')));
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => openUrl(daemon.buildDashboardUrl('#settings')));

    if (btnChangeServer) btnChangeServer.addEventListener('click', openServerEditor);
    if (btnChangeServerOffline) btnChangeServerOffline.addEventListener('click', openServerEditor);

    if (serverEditorForm) serverEditorForm.addEventListener('submit', saveServerUrl);
    if (btnCancelServer) btnCancelServer.addEventListener('click', closeServerEditor);

    if (btnRetryConnection) {
      btnRetryConnection.addEventListener('click', () => {
        setStatus('checking', 'Connecting…');
        checkDaemon();
      });
    }
  }

  // =========================================================================
  // Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      initTheme();
    } catch (e) {
      console.warn('[InstaVault HUD] initTheme error:', e);
    }

    try {
      bindEvents();
    } catch (e) {
      console.error('[InstaVault HUD] bindEvents error:', e);
    }

    try {
      const footerVer = document.getElementById('footerVer');
      if (footerVer && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        const v = chrome.runtime.getManifest().version;
        if (v) footerVer.textContent = `v${v}`;
      }
    } catch (e) {
      console.warn('[InstaVault HUD] manifest version error:', e);
    }

    await daemon.getBaseUrl();
    updateServerDisplay();
    checkDaemon();

    pollTimer = setInterval(checkDaemon, POLL_INTERVAL_MS);
  });

  window.addEventListener('unload', () => {
    if (pollTimer) clearInterval(pollTimer);
    daemon.closeEvents();
  });
})();

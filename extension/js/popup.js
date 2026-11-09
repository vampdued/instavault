/**
 * InstaVault Toolbar Popup Controller
 * Manages live daemon telemetry, connection health checks, theme state, and tab navigation.
 */

(function () {
  'use strict';

  let daemonBaseUrl = 'http://localhost:19201';
  const POLL_INTERVAL_MS = 3000;
  const FETCH_TIMEOUT_MS = 2500;

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

  let pollTimer = null;
  let isChecking = false;

  function updateServerDisplay() {
    try {
      const u = new URL(daemonBaseUrl);
      const portText = u.port ? `:${u.port}` : '';
      if (btnVaultPort) btnVaultPort.textContent = portText || ':19201';
      if (serverAddressDisplay) serverAddressDisplay.textContent = u.host || 'localhost:19201';
    } catch (e) {
      if (btnVaultPort) btnVaultPort.textContent = ':19201';
      if (serverAddressDisplay) serverAddressDisplay.textContent = daemonBaseUrl;
    }
  }

  function promptChangeServer() {
    const input = prompt(
      'Enter InstaVault Daemon URL:\n• Production default: http://localhost:19201\n• Development default: http://localhost:19202',
      daemonBaseUrl
    );
    if (input && input.trim()) {
      let cleanUrl = input.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'http://' + cleanUrl;
      }
      daemonBaseUrl = cleanUrl;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ serverUrl: cleanUrl }, () => {
          updateServerDisplay();
          setStatus('checking', 'Connecting…');
          checkDaemon();
        });
      } else {
        updateServerDisplay();
        setStatus('checking', 'Connecting…');
        checkDaemon();
      }
    }
  }

  // =========================================================================
  // Helper: Open Tab in Chrome
  // =========================================================================
  function openUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: url });
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
      isLight ? 'Switch to dark theme' : 'Switch to light theme'
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
          // Check local storage fallback
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
    } catch (e) {
      // Ignored
    }

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
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = FETCH_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  function setStatus(state, message) {
    daemonStatus.classList.remove('status-online', 'status-offline', 'status-checking');
    if (state === 'online') {
      daemonStatus.classList.add('status-online');
      statusText.textContent = message || 'Daemon Online';
    } else if (state === 'offline') {
      daemonStatus.classList.add('status-offline');
      statusText.textContent = message || 'Offline';
    } else {
      daemonStatus.classList.add('status-checking');
      statusText.textContent = message || 'Checking…';
    }
  }

  async function checkDaemon() {
    if (isChecking) return;
    isChecking = true;

    try {
      // Parallel fetch for stats and settings
      const [statsRes, settingsRes] = await Promise.all([
        fetchWithTimeout(`${daemonBaseUrl}/api/stats`),
        fetchWithTimeout(`${daemonBaseUrl}/api/settings`).catch(() => null)
      ]);

      if (!statsRes.ok) {
        throw new Error(`HTTP error ${statsRes.status}`);
      }

      const stats = await statsRes.json();
      let settings = null;
      if (settingsRes && settingsRes.ok) {
        settings = await settingsRes.json();
      }

      renderOnline(stats, settings);
    } catch (err) {
      renderOffline(err);
    } finally {
      isChecking = false;
    }
  }

  function renderOnline(stats, settings) {
    setStatus('online', 'Daemon Online');

    onlineView.classList.remove('hidden');
    offlineView.classList.add('hidden');

    // Telemetry counts
    statTotalDownloads.textContent = formatNumber(stats.totalDownloads);
    statUniqueAccounts.textContent = formatNumber(stats.uniqueAccounts);
    statTotalSkipped.textContent = formatNumber(stats.totalSkipped);

    // Min extension version check (numerical semver comparison)
    if (extUpdateBanner) {
      let extVer = '1.0.0';
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        extVer = chrome.runtime.getManifest().version || '1.0.0';
      }
      const isOutdated = (current, minReq) => {
        if (!minReq) return false;
        const c = String(current).split('.').map(n => parseInt(n, 10) || 0);
        const m = String(minReq).split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(c.length, m.length); i++) {
          const cv = c[i] || 0;
          const mv = m[i] || 0;
          if (cv < mv) return true;
          if (cv > mv) return false;
        }
        return false;
      };
      if (stats.minExtensionVersion && isOutdated(extVer, stats.minExtensionVersion)) {
        extUpdateBanner.classList.remove('hidden');
      } else {
        extUpdateBanner.classList.add('hidden');
      }
    }

    // Active sync banner
    if (stats.activeSync && stats.activeSync.isActive) {
      activeSyncCard.classList.remove('hidden');
      activeSyncUser.textContent = stats.activeSync.username ? `@${stats.activeSync.username}` : 'In progress…';
    } else {
      activeSyncCard.classList.add('hidden');
    }

    // Disk storage metrics
    if (stats.diskTotal && stats.diskTotal > 0) {
      const total = stats.diskTotal;
      const free = stats.diskFree;
      const used = total - free;
      const usedPercent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));

      storageUsageRatio.textContent = `${usedPercent}% used`;
      storageProgressBar.setAttribute('aria-valuenow', usedPercent);
      storageBarFill.style.width = `${usedPercent}%`;
      storageFreeText.textContent = `${formatBytes(free)} free of ${formatBytes(total)}`;
    } else {
      storageUsageRatio.textContent = 'Ready';
      storageBarFill.style.width = '100%';
      storageFreeText.textContent = 'Storage telemetry unavailable';
    }

    // Settings folder preview
    if (settings && settings.baseDir) {
      footerDir.textContent = settings.baseDir;
      footerDir.title = `Vault Storage: ${settings.baseDir}`;
    } else {
      footerDir.textContent = 'Default Vault Folder';
    }
  }

  function renderOffline(error) {
    setStatus('offline', 'Offline');

    onlineView.classList.add('hidden');
    offlineView.classList.remove('hidden');
    activeSyncCard.classList.add('hidden');

    footerDir.textContent = 'Daemon not connected';
  }

  // =========================================================================
  // Event Bindings
  // =========================================================================
  function bindEvents() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    btnOpenVault.addEventListener('click', () => openUrl(daemonBaseUrl));
    btnLaunchInstagram.addEventListener('click', () => openUrl('https://www.instagram.com'));
    btnLaunchInstagramOffline.addEventListener('click', () => openUrl('https://www.instagram.com'));

    btnOpenSkipped.addEventListener('click', () => openUrl(`${daemonBaseUrl}/#skipped`));
    btnOpenSettings.addEventListener('click', () => openUrl(`${daemonBaseUrl}/#settings`));

    if (btnChangeServer) {
      btnChangeServer.addEventListener('click', promptChangeServer);
    }
    if (btnChangeServerOffline) {
      btnChangeServerOffline.addEventListener('click', promptChangeServer);
    }

    btnRetryConnection.addEventListener('click', () => {
      setStatus('checking', 'Connecting…');
      checkDaemon();
    });
  }

  // =========================================================================
  // Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindEvents();

    // Populate version from manifest
    const footerVer = document.getElementById('footerVer');
    if (footerVer && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const v = chrome.runtime.getManifest().version;
      if (v) footerVer.textContent = `v${v}`;
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ serverUrl: 'http://localhost:19201' }, (cfg) => {
        if (cfg && cfg.serverUrl) {
          daemonBaseUrl = cfg.serverUrl.replace(/\/+$/, '');
        }
        updateServerDisplay();
        checkDaemon();
      });
    } else {
      updateServerDisplay();
      checkDaemon();
    }

    // Polling setup
    pollTimer = setInterval(checkDaemon, POLL_INTERVAL_MS);
  });

  window.addEventListener('unload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();

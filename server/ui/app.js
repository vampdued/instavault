document.addEventListener('DOMContentLoaded', () => {
    // ─── Theme Management ────────────────────────────────────────────────────
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeLabel = themeToggleBtn.querySelector('.sidebar-label');
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
            if (themeLabel) themeLabel.textContent = 'Dark Theme';
            localStorage.setItem('theme', 'dark');
        } else {
            htmlEl.classList.remove('dark');
            if (themeLabel) themeLabel.textContent = 'Light Theme';
            localStorage.setItem('theme', 'light');
        }
        lucide.createIcons();
    }
    
    // Read from localStorage (default: dark theme)
    const activeTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(activeTheme);
    
    themeToggleBtn.addEventListener('click', () => {
        const isCurrentlyDark = htmlEl.classList.contains('dark');
        applyTheme(isCurrentlyDark ? 'light' : 'dark');
    });

    // ─── Collapsible Sidebar Management ──────────────────────────────────────
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    
    function applySidebarState(collapsed) {
        if (collapsed) {
            sidebar.classList.add('collapsed');
            sidebarToggle.setAttribute('aria-expanded', 'false');
            sidebarToggle.setAttribute('aria-label', 'Expand Sidebar');
            sidebarToggle.setAttribute('data-custom-tooltip', 'Expand Sidebar');
        } else {
            sidebar.classList.remove('collapsed');
            sidebarToggle.setAttribute('aria-expanded', 'true');
            sidebarToggle.setAttribute('aria-label', 'Collapse Sidebar');
            sidebarToggle.setAttribute('data-custom-tooltip', 'Collapse Sidebar');
        }
    }
    
    // Read from localStorage (default: collapsed on tablet 768-1023px, expanded on >= 1024px)
    const savedSidebarPref = localStorage.getItem('sidebar-collapsed');
    let isSidebarCollapsed = false;
    if (savedSidebarPref !== null) {
        isSidebarCollapsed = savedSidebarPref === 'true';
    } else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        isSidebarCollapsed = true;
    }
    applySidebarState(isSidebarCollapsed);
    
    sidebarToggle.addEventListener('click', () => {
        const collapsedState = !sidebar.classList.contains('collapsed');
        applySidebarState(collapsedState);
        localStorage.setItem('sidebar-collapsed', collapsedState);
    });

    // Global Keyboard Shortcuts (Ctrl+B to Toggle Sidebar)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            const collapsedState = !sidebar.classList.contains('collapsed');
            applySidebarState(collapsedState);
            localStorage.setItem('sidebar-collapsed', collapsedState);
        }
    });

    // Mobile Responsive Sidebar Toggler & Backdrop Overlay
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    function setMobileSidebar(open) {
        if (open) {
            sidebar.classList.remove('-translate-x-full');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.remove('opacity-0', 'pointer-events-none');
                sidebarBackdrop.classList.add('opacity-100');
            }
        } else {
            sidebar.classList.add('-translate-x-full');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.remove('opacity-100');
                sidebarBackdrop.classList.add('opacity-0', 'pointer-events-none');
            }
        }
    }

    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            setMobileSidebar(!isOpen);
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            setMobileSidebar(false);
        });
    }

    // Dismiss sidebar when tapping viewport outside on mobile screens
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && !sidebar.contains(e.target) && (!mobileSidebarToggle || !mobileSidebarToggle.contains(e.target))) {
            setMobileSidebar(false);
        }
    });

    // ─── Ticking Session Local Clock ──────────────────────────────────────────
    const clockEl = document.getElementById('session-time');
    function updateClock() {
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ─── Workspace Views & Dynamic Navigation ───────────────────────────────
    const navLinks = document.querySelectorAll('aside nav a');
    const mobileDockItems = document.querySelectorAll('#mobile-bottom-dock button');
    const views = document.querySelectorAll('.view');
    const headerTitle = document.getElementById('active-view-title');

    function switchToView(targetView) {
        if (!targetView) return;

        // Sync Desktop Nav Links
        navLinks.forEach(l => {
            if (l.getAttribute('data-view') === targetView) {
                l.classList.add('active');
            } else {
                l.classList.remove('active');
            }
        });

        // Sync Mobile Bottom Dock Items
        mobileDockItems.forEach(b => {
            if (b.getAttribute('data-view') === targetView) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Switch Active View Panel
        views.forEach(v => v.classList.remove('active'));
        const targetViewEl = document.getElementById(targetView);
        if (targetViewEl) targetViewEl.classList.add('active');

        // Sync Header Navigation Text
        if (headerTitle) {
            const activeNavLink = document.querySelector(`aside nav a[data-view="${targetView}"]`);
            const labelText = activeNavLink && activeNavLink.querySelector('.sidebar-label') 
                ? activeNavLink.querySelector('.sidebar-label').textContent 
                : (targetView.charAt(0).toUpperCase() + targetView.slice(1));
            headerTitle.textContent = labelText;
        }

        // Slide out mobile sidebar drawer if open
        if (window.innerWidth < 768) {
            setMobileSidebar(false);
        }

        // Refresh view data
        if (targetView === 'dashboard') loadStats();
        if (targetView === 'activity') loadStats();
        if (targetView === 'gallery') loadGallery();
        if (targetView === 'downloads') {
            loadDownloads();
            loadSkipped();
        }
        if (targetView === 'settings') loadSettings();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView(link.getAttribute('data-view'));
        });
    });

    mobileDockItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView(btn.getAttribute('data-view'));
        });
    });

    // Delegated in-page data-view links (e.g. "Browse Gallery")
    document.addEventListener('click', (e) => {
        const viewTrigger = e.target.closest('[data-view]');
        if (viewTrigger && !viewTrigger.closest('nav')) {
            e.preventDefault();
            const targetView = viewTrigger.getAttribute('data-view');
            switchToView(targetView);
        }
    });

    // ─── Downloads & Skipped Tab Switching ────────────────────────────────────
    const tabDownloaded = document.getElementById('tab-downloaded');
    const tabSkipped = document.getElementById('tab-skipped');
    const panelDownloaded = document.getElementById('panel-downloaded');
    const panelSkipped = document.getElementById('panel-skipped');
    const clearDownloadsBtn = document.getElementById('clear-downloads-btn');
    const clearSkippedBtn = document.getElementById('clear-skipped-btn');

    if (tabDownloaded && tabSkipped) {
        tabDownloaded.addEventListener('click', () => {
            tabDownloaded.classList.add('active');
            tabSkipped.classList.remove('active');
            if (panelDownloaded) panelDownloaded.classList.remove('hidden');
            if (panelSkipped) panelSkipped.classList.add('hidden');
            if (clearDownloadsBtn) clearDownloadsBtn.classList.remove('hidden');
            if (clearSkippedBtn) clearSkippedBtn.classList.add('hidden');
            loadDownloads();
        });

        tabSkipped.addEventListener('click', () => {
            tabSkipped.classList.add('active');
            tabDownloaded.classList.remove('active');
            if (panelSkipped) panelSkipped.classList.remove('hidden');
            if (panelDownloaded) panelDownloaded.classList.add('hidden');
            if (clearDownloadsBtn) clearDownloadsBtn.classList.add('hidden');
            if (clearSkippedBtn) clearSkippedBtn.classList.remove('hidden');
            loadSkipped();
        });
    }

    // ─── Utility Formatting Functions ─────────────────────────────────────────
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    }

    // ─── Pro Telemetry Terminal Buffer & Filtering ───────────────────────────
    let liveLogBuffer = [];
    let activeConsoleFilter = 'all';
    let consoleAutoScroll = true;

    const consoleFeed = document.getElementById('live-console-feed');
    const consoleEventCounter = document.getElementById('console-event-counter');
    const consoleAutoscrollBtn = document.getElementById('console-autoscroll-btn');
    const consoleAutoscrollLabel = document.getElementById('console-autoscroll-label');
    const consoleCopyBtn = document.getElementById('console-copy-btn');
    const consoleCopyLabel = document.getElementById('console-copy-label');
    const consoleClearBtn = document.getElementById('console-clear-btn');
    const consoleFilterPills = document.querySelectorAll('.console-filter-pill');

    function renderConsoleFeed(isActive) {
        if (!consoleFeed) return;

        // Filter logs according to active filter
        const filtered = liveLogBuffer.filter(log => {
            if (activeConsoleFilter === 'all') return true;
            if (activeConsoleFilter === 'completed') return log.status === 'completed' || log.status === 'downloading';
            if (activeConsoleFilter === 'skipped') return log.status === 'skipped';
            if (activeConsoleFilter === 'error') return log.status === 'failed' || log.status === 'error';
            return true;
        });

        // Update Event Counter
        if (consoleEventCounter) {
            consoleEventCounter.textContent = `${liveLogBuffer.length} events`;
        }

        if (liveLogBuffer.length === 0) {
            consoleFeed.innerHTML = `
                <div class="text-slate-600 font-bold border-b border-slate-900 pb-1.5 mb-2 flex items-center justify-between">
                    <span>// InstaVault Pro Telemetry Daemon v1.1.0</span>
                    <span class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">${isActive ? '🟢 streaming' : '⚪ ready'}</span>
                </div>
                <div class="text-slate-500 font-bold">// Listening for incoming browser extension events...</div>
                <div class="text-slate-700 italic text-[10px] mt-2 border-t border-slate-900/80 pt-2">Awaiting active scrape stream from Instagram client...</div>
            `;
            return;
        }

        const isScrolledToBottom = consoleFeed.scrollHeight - consoleFeed.clientHeight <= consoleFeed.scrollTop + 30;

        let html = `
            <div class="text-slate-600 font-bold border-b border-slate-900 pb-1.5 mb-2 flex items-center justify-between">
                <span>// InstaVault Pro Telemetry Daemon v1.1.0</span>
                <span class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">${isActive ? '🟢 streaming' : '⚪ ready'}</span>
            </div>
        `;

        filtered.forEach(log => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let badgeHtml = '';
            let lineClass = 'text-slate-300';

            if (log.status === 'downloading') {
                badgeHtml = '<span class="terminal-badge badge-completed flex items-center gap-1 animate-pulse"><i data-lucide="loader" class="w-2.5 h-2.5 animate-spin"></i> DL</span>';
                lineClass = 'text-sky-300';
            } else if (log.status === 'completed') {
                badgeHtml = '<span class="terminal-badge badge-completed">DOWNLOAD</span>';
                lineClass = 'text-emerald-300/90';
            } else if (log.status === 'skipped') {
                badgeHtml = '<span class="terminal-badge badge-skipped">SKIPPED</span>';
                lineClass = 'text-amber-300/90';
            } else if (log.status === 'failed' || log.status === 'error') {
                badgeHtml = `<span class="terminal-badge badge-error" title="${log.error || ''}">ERROR</span>`;
                lineClass = 'text-rose-300/90';
            } else {
                badgeHtml = `<span class="terminal-badge text-slate-400 bg-slate-800/80 border border-slate-700/60">${log.status}</span>`;
            }

            const filenameTrunc = log.filename.length > 55 ? log.filename.substring(0, 52) + '...' : log.filename;

            html += `
                <div class="terminal-log-row flex items-center justify-between gap-3 text-[11px] py-1 border-b border-slate-900/60 px-2 rounded font-mono ${lineClass}">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-slate-500 shrink-0 font-light">[${timeStr}]</span>
                        <span class="text-accent-400 font-bold shrink-0">@${log.username}</span>
                        <span class="truncate font-medium text-slate-200" title="${log.filename}">${filenameTrunc}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        ${log.size ? `<span class="text-[9px] text-slate-400 font-mono font-medium">${formatBytes(log.size)}</span>` : ''}
                        ${badgeHtml}
                    </div>
                </div>
            `;
        });

        consoleFeed.innerHTML = html;
        if (window.lucide) lucide.createIcons();

        if (consoleAutoScroll && (isScrolledToBottom || isActive)) {
            consoleFeed.scrollTop = consoleFeed.scrollHeight;
        }
    }

    // Filter Pills Setup
    consoleFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            consoleFilterPills.forEach(p => {
                p.classList.remove('active', 'bg-accent-500', 'text-white');
                p.classList.add('text-slate-400');
            });
            pill.classList.add('active', 'bg-accent-500', 'text-white');
            pill.classList.remove('text-slate-400');
            activeConsoleFilter = pill.getAttribute('data-filter');
            renderConsoleFeed(false);
        });
    });

    // Auto-Scroll Lock Button
    if (consoleAutoscrollBtn) {
        consoleAutoscrollBtn.addEventListener('click', () => {
            consoleAutoScroll = !consoleAutoScroll;
            if (consoleAutoScroll) {
                consoleAutoscrollBtn.className = "h-7 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer";
                if (consoleAutoscrollLabel) consoleAutoscrollLabel.textContent = "SCROLL LOCK: ON";
                if (consoleFeed) consoleFeed.scrollTop = consoleFeed.scrollHeight;
            } else {
                consoleAutoscrollBtn.className = "h-7 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer";
                if (consoleAutoscrollLabel) consoleAutoscrollLabel.textContent = "SCROLL LOCK: OFF";
            }
        });
    }

    // Clear Console Feed
    if (consoleClearBtn) {
        consoleClearBtn.addEventListener('click', () => {
            liveLogBuffer = [];
            renderConsoleFeed(false);
        });
    }

    // Copy Logs to Clipboard
    if (consoleCopyBtn) {
        consoleCopyBtn.addEventListener('click', async () => {
            if (liveLogBuffer.length === 0) return;
            const textLines = liveLogBuffer.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.status.toUpperCase()}] @${l.username} ${l.filename} ${l.size ? formatBytes(l.size) : ''}`).join('\n');
            try {
                await navigator.clipboard.writeText(textLines);
                if (consoleCopyLabel) consoleCopyLabel.textContent = "COPIED!";
                setTimeout(() => {
                    if (consoleCopyLabel) consoleCopyLabel.textContent = "COPY";
                }, 1500);
            } catch (err) {
                console.error("Failed to copy logs:", err);
            }
        });
    }

    // ─── Dashboard Loader (Stats & Accounts) ──────────────────────────────────
    async function loadStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('stat-total-dl').textContent = data.totalDownloads || 0;
            document.getElementById('stat-total-skipped').textContent = data.totalSkipped || 0;
            document.getElementById('stat-unique-accounts').textContent = data.uniqueAccounts || 0;

            // Handle Storage Capacity Metrics
            if (typeof data.diskTotal !== 'undefined' && data.diskFree !== 'undefined' && data.diskTotal > 0) {
                const total = data.diskTotal;
                const free = data.diskFree;
                const used = total - free;
                const percentUsed = Math.round((used / total) * 100);

                const totalStr = formatBytes(total);
                const freeStr = formatBytes(free);
                const usedStr = formatBytes(used);

                const textEl = document.getElementById('stat-disk-text');
                const percentEl = document.getElementById('stat-disk-percent');
                const freeEl = document.getElementById('stat-disk-free');
                const barEl = document.getElementById('stat-disk-bar');
                const warningBadge = document.getElementById('stat-disk-warning');

                if (textEl) textEl.textContent = `${usedStr} / ${totalStr}`;
                if (percentEl) percentEl.textContent = `${percentUsed}% used`;
                if (freeEl) freeEl.textContent = `${freeStr} free`;
                if (barEl) {
                    barEl.style.width = `${percentUsed}%`;
                    if (percentUsed >= 90) {
                        barEl.className = "bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-full transition-all duration-700 ease-out";
                        if (warningBadge) warningBadge.classList.remove('hidden');
                    } else if (percentUsed >= 80) {
                        barEl.className = "bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-700 ease-out";
                        if (warningBadge) warningBadge.classList.add('hidden');
                    } else {
                        barEl.className = "bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700 ease-out";
                        if (warningBadge) warningBadge.classList.add('hidden');
                    }
                }
            }

            // Handle Dynamic Dashboard Hero Banner (Idle vs Active Scrape Stream)
            const heroIdle = document.getElementById('dashboard-hero-idle');
            const heroActive = document.getElementById('dashboard-hero-active');
            const heroUsername = document.getElementById('hero-active-username');
            const heroAvatar = document.getElementById('hero-active-avatar');
            const heroStatus = document.getElementById('hero-active-status');

            if (heroIdle && heroActive) {
                if (data.activeSync && data.activeSync.isActive) {
                    heroIdle.classList.add('hidden');
                    heroActive.classList.remove('hidden');
                    const uname = data.activeSync.username || 'unknown';
                    if (heroUsername) heroUsername.textContent = '@' + uname;
                    if (heroAvatar) heroAvatar.textContent = uname.substring(0, 2).toUpperCase();

                    if (data.activeSync.liveLogs && data.activeSync.liveLogs.length > 0) {
                        const last = data.activeSync.liveLogs[data.activeSync.liveLogs.length - 1];
                        if (heroStatus) {
                            const statusLabel = last.status === 'completed' ? 'Saved' : (last.status === 'skipped' ? 'Skipped duplicate' : (last.status === 'failed' ? 'Failed' : last.status));
                            const sizeText = last.size ? ` (${formatBytes(last.size)})` : '';
                            heroStatus.textContent = `Latest: ${last.filename || last.shortcode}${sizeText} • [${statusLabel.toUpperCase()}]`;
                        }
                    } else if (heroStatus) {
                        heroStatus.textContent = 'Syncing media stream from Instagram in real-time...';
                    }
                } else {
                    heroIdle.classList.remove('hidden');
                    heroActive.classList.add('hidden');
                }
            }

            // Handle Live Extension Syncing indicators (Top-bar badge)
            const syncBadge = document.getElementById('ext-sync-badge');
            if (data.activeSync && data.activeSync.isActive) {
                if (syncBadge) {
                    syncBadge.classList.remove('hidden');
                    syncBadge.classList.add('flex');
                    document.getElementById('ext-sync-info').textContent = '@' + data.activeSync.username;
                }
            } else {
                if (syncBadge) {
                    syncBadge.classList.add('hidden');
                    syncBadge.classList.remove('flex');
                }
            }

            // Handle Live Terminal Sync Console Status
            const consoleStatusBadge = document.getElementById('console-status-badge');
            const consoleStatusText = document.getElementById('console-status-text');
            const consolePing = document.getElementById('console-ping');
            const consoleDot = document.getElementById('console-dot');

            if (data.activeSync) {
                const isActive = data.activeSync.isActive;
                
                // Update Console Status Badge Aesthetics
                if (consoleStatusBadge && consoleStatusText) {
                    if (isActive) {
                        consoleStatusBadge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all duration-300 animate-pulse";
                        consoleStatusText.textContent = "ACTIVE SYNC";
                        if (consolePing) {
                            consolePing.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
                        }
                        if (consoleDot) {
                            consoleDot.className = "relative inline-flex rounded-full h-2 w-2 bg-emerald-500";
                        }
                    } else {
                        consoleStatusBadge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-300";
                        consoleStatusText.textContent = "IDLE";
                        if (consolePing) {
                            consolePing.className = "absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75";
                        }
                        if (consoleDot) {
                            consoleDot.className = "relative inline-flex rounded-full h-2 w-2 bg-slate-500";
                        }
                    }
                }

                // Render Live Terminal Log Stream
                if (data.activeSync.liveLogs) {
                    const existingKeys = new Set(liveLogBuffer.map(l => l.timestamp + l.filename));
                    data.activeSync.liveLogs.forEach(log => {
                        const key = log.timestamp + log.filename;
                        if (!existingKeys.has(key)) {
                            liveLogBuffer.push(log);
                            existingKeys.add(key);
                        }
                    });
                    if (liveLogBuffer.length > 500) {
                        liveLogBuffer = liveLogBuffer.slice(-500);
                    }
                    renderConsoleFeed(isActive);
                }
            }

            const accRes = await fetch('/api/accounts');
            const accounts = await accRes.json();
            
            const accountsGrid = document.getElementById('accounts-cards-grid');
            if (accountsGrid) {
                accountsGrid.innerHTML = '';
                
                if (accounts.length === 0) {
                    accountsGrid.className = "grid grid-cols-1 gap-4";
                    accountsGrid.innerHTML = `
                        <div class="col-span-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 text-center shadow-sm">
                            <div class="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <i data-lucide="inbox" class="w-8 h-8 text-slate-350 dark:text-slate-655"></i>
                                <span class="text-xs font-medium">No download profile data captured yet.</span>
                            </div>
                        </div>`;
                } else {
                    // Auto-fit: If 2 profiles exist, use 2 columns (50% each) for symmetrical balance
                    accountsGrid.className = accounts.length === 2 
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
                        : (accounts.length === 1 ? "grid grid-cols-1 max-w-md gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4");

                    accounts.forEach(acc => {
                        const card = document.createElement('div');
                        card.className = "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between gap-4 group";
                        const initial = (acc.username || 'IG').substring(0, 2).toUpperCase();
                        card.innerHTML = `
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="p-0.5 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm shrink-0">
                                        <div class="w-10 h-10 rounded-[10px] bg-white dark:bg-slate-900 text-accent-500 font-display font-extrabold text-xs flex items-center justify-center uppercase shadow-inner">
                                            ${initial}
                                        </div>
                                    </div>
                                    <div class="min-w-0">
                                        <h4 class="font-display font-bold text-sm text-slate-900 dark:text-white truncate">@${acc.username}</h4>
                                        <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">${acc.count} Media Items</span>
                                    </div>
                                </div>
                                <a href="https://instagram.com/${acc.username}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-accent-50 dark:hover:bg-accent-500/10 text-slate-400 hover:text-accent-500 flex items-center justify-center transition-colors shrink-0" title="Open Instagram profile in new tab">
                                    <i data-lucide="external-link" class="w-4 h-4"></i>
                                </a>
                            </div>

                            <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60">
                                <span class="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">Synced Vault</span>
                                <button type="button" data-view="gallery" class="view-account-gallery-btn h-8 px-3.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer ml-auto" data-username="${acc.username}" title="View @${acc.username}'s items in Gallery">
                                    <span>Gallery</span>
                                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        `;
                        accountsGrid.appendChild(card);
                    });
                }
                lucide.createIcons();
            }
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // ─── Recent Downloads Loader ──────────────────────────────────────────────
    async function loadDownloads() {
        try {
            const res = await fetch('/api/downloads?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#downloads-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="download" class="w-9 h-9 text-slate-350 dark:text-slate-655"></i>
                                <span>No downloads located in history.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 whitespace-nowrap font-medium text-xs">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>${formatDate(item.downloadedAt)}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                        <span class="hover:text-accent-500 transition-colors cursor-pointer">@${item.username}</span>
                    </td>
                    <td class="py-4 px-6 text-slate-650 dark:text-slate-300 font-mono text-xs truncate max-w-[200px]" title="${item.filename}">${item.filename}</td>
                    <td class="py-4 px-6 text-slate-500 dark:text-slate-400 whitespace-nowrap font-semibold text-xs">${formatBytes(item.fileSize)}</td>
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 font-mono text-xs truncate max-w-[280px]" title="${item.localPath}">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-text" class="w-3.5 h-3.5 flex-shrink-0 text-slate-400"></i>
                            <span class="truncate">${item.localPath}</span>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
        } catch (e) {
            console.error('Failed to load downloads', e);
        }
    }

    // ─── Skipped Duplicates Loader ────────────────────────────────────────────
    async function loadSkipped() {
        try {
            const res = await fetch('/api/skipped?limit=50');
            const data = await res.json();
            
            const tbody = document.querySelector('#skipped-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="check-square" class="w-9 h-9 text-slate-350 dark:text-slate-655"></i>
                                <span>Excellent. No bypassed duplicates recorded.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 text-slate-400 dark:text-slate-500 whitespace-nowrap font-medium text-xs">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>${formatDate(item.skippedAt)}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">@${item.username}</td>
                    <td class="py-4 px-6 text-slate-650 dark:text-slate-300 font-mono text-xs truncate max-w-[200px]" title="${item.filename}">${item.filename}</td>
                    <td class="py-4 px-6 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                            <i data-lucide="copy" class="w-3 h-3"></i> Already Exists
                        </span>
                    </td>
                    <td class="py-4 px-6 text-center whitespace-nowrap">
                        <button class="force-dl-btn h-8 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95 border border-rose-500/20 dark:border-rose-500/30 bg-rose-500/5 transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span>Clear</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Bind Force Download/Delete button handlers
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    const originalHTML = button.innerHTML;
                    button.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Clearing...`;
                    button.disabled = true;
                    lucide.createIcons();

                    try {
                        const id = button.getAttribute('data-id');
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            button.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-white"></i> Cleared!`;
                            button.classList.remove('text-rose-600', 'dark:text-rose-400', 'hover:bg-rose-500/10', 'border-rose-500/20', 'bg-rose-500/5');
                            button.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
                            lucide.createIcons();
                            setTimeout(() => loadSkipped(), 1200);
                        } else {
                            throw new Error('Failed to delete skip entry.');
                        }
                    } catch (err) {
                        console.error(err);
                        button.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Error`;
                        button.disabled = false;
                        lucide.createIcons();
                    }
                });
            });

            lucide.createIcons();
        } catch (e) {
            console.error('Failed to load skipped', e);
        }
    }

    // ─── Settings Loader & Save ──────────────────────────────────────────────
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                document.getElementById('base-dir').value = data.baseDir;
            }
            if (data.folderStructure) {
                document.getElementById('folder-structure').value = data.folderStructure;
                if (window.syncCustomSelect) {
                    window.syncCustomSelect(data.folderStructure);
                }
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }

    document.getElementById('save-settings').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        const baseDir = document.getElementById('base-dir').value.trim();
        const folderStructure = document.getElementById('folder-structure').value;
        
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving Parameters...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseDir, folderStructure })
            });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Saved Securely!`;
                btn.classList.remove('bg-accent-500', 'hover:bg-accent-600');
                btn.classList.add('bg-emerald-600');
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('bg-emerald-600');
                    btn.classList.add('bg-accent-500', 'hover:bg-accent-600');
                    btn.disabled = false;
                    lucide.createIcons();
                }, 2000);
            } else {
                throw new Error('Failed to save settings.');
            }
        } catch (err) {
            alert('Error updating workspace settings: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    // ─── Global Clean Up Functions ───────────────────────────────────────────
    document.getElementById('clear-downloads-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you absolutely sure you want to clear the entire download logs database? Local files on disk will NOT be modified.')) return;
        
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Clearing database...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/downloads', { method: 'DELETE' });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Logs Purged!`;
                lucide.createIcons();
                loadDownloads();
                loadStats();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    lucide.createIcons();
                }, 1500);
            } else {
                throw new Error('Failed to clear download database.');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing download logs: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    document.getElementById('clear-skipped-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you absolutely sure you want to purge the skipped duplicates log? If files are moved, future downloads will trigger duplicates re-downloads.')) return;
        
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Purging bypasses...`;
        btn.disabled = true;
        lucide.createIcons();

        try {
            const res = await fetch('/api/skipped', { method: 'DELETE' });
            if (res.ok) {
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Purge Complete!`;
                lucide.createIcons();
                loadSkipped();
                loadStats();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    lucide.createIcons();
                }, 1500);
            } else {
                throw new Error('Failed to purge bypass database.');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing bypass database: ' + err.message);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            lucide.createIcons();
        }
    });

    // ─── Custom Simulated Dropdown Menu Logic ─────────────────────────────────
    const dropdownDropdown = document.getElementById('folder-structure-dropdown');
    const dropdownTrigger = document.getElementById('folder-structure-trigger');
    const dropdownOptions = document.getElementById('folder-structure-options');
    const dropdownChevron = document.getElementById('folder-structure-chevron');
    const dropdownSelectedText = document.getElementById('folder-structure-selected-text');
    const dropdownHiddenInput = document.getElementById('folder-structure');

    const optTexts = {
        'profile': 'Profile Folder (e.g. /Instagram/username/filename.jpg)',
        'flat': 'Flat Folder (e.g. /Instagram/filename.jpg)',
        'profile_type': 'Profile + Media Type (e.g. /Instagram/username/videos/filename.mp4)'
    };

    window.syncCustomSelect = function(val) {
        if (!dropdownHiddenInput) return;
        dropdownHiddenInput.value = val;
        
        // Update Trigger Button Text
        if (dropdownSelectedText) {
            dropdownSelectedText.textContent = optTexts[val] || val;
        }

        // Update active class on option buttons
        const optionButtons = document.querySelectorAll('.dropdown-opt');
        optionButtons.forEach(opt => {
            if (opt.getAttribute('data-val') === val) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    };

    if (dropdownTrigger && dropdownOptions) {
        // Toggle dropdown open/close
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !dropdownOptions.classList.contains('invisible');
            if (isOpen) {
                closeCustomDropdown();
            } else {
                openCustomDropdown();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (dropdownDropdown && !dropdownDropdown.contains(e.target)) {
                closeCustomDropdown();
            }
        });

        // Click option buttons to select
        const optionButtons = document.querySelectorAll('.dropdown-opt');
        optionButtons.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const val = opt.getAttribute('data-val');
                window.syncCustomSelect(val);
                closeCustomDropdown();
            });
        });
    }

    function openCustomDropdown() {
        if (window.closeGalleryDropdown) window.closeGalleryDropdown();
        if (!dropdownOptions) return;
        dropdownOptions.classList.remove('opacity-0', 'invisible', 'scale-95');
        dropdownOptions.classList.add('opacity-100', 'visible', 'scale-100');
        if (dropdownChevron) dropdownChevron.classList.add('rotate-180');
    }

    window.closeCustomDropdown = function() {
        if (!dropdownOptions) return;
        dropdownOptions.classList.remove('opacity-100', 'visible', 'scale-100');
        dropdownOptions.classList.add('opacity-0', 'invisible', 'scale-95');
        if (dropdownChevron) dropdownChevron.classList.remove('rotate-180');
    }

    // ─── Vault Gallery Engine ────────────────────────────────────────────────
    let galleryData = []; // Raw download logs from API
    let groupedPosts = []; // Downloads grouped by shortcode
    let activeUsernameFilter = null; // null means "All"
    let activeTypeFilter = 'all'; // 'all', 'photo', 'video'
    let activeSort = 'newest';
    let currentGroupedPostIndex = -1;
    let currentSlideIndex = -1;
    let filteredGalleryItems = []; // Grouped posts currently visible

    // Helper to extract sequential slide index suffix from Instagram file names (e.g. "_2.jpg" -> 2)
    function getSlideIndex(filename) {
        const dotIdx = filename.lastIndexOf('.');
        const withoutExt = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;
        const parts = withoutExt.split('_');
        const lastPart = parts[parts.length - 1];
        const idx = parseInt(lastPart, 10);
        if (!isNaN(idx) && idx < 100) {
            return idx;
        }
        return 1;
    }

    // Aggregates raw downloaded files into Instagram-style post groups sharing the same shortcode
    function groupMediaItems(flatItems) {
        const postsMap = {};
        flatItems.forEach(item => {
            const sc = item.shortcode || 'unknown';
            if (!postsMap[sc]) {
                postsMap[sc] = {
                    shortcode: sc,
                    username: item.username,
                    downloadedAt: item.downloadedAt,
                    items: []
                };
            }
            postsMap[sc].items.push(item);
            if (new Date(item.downloadedAt) > new Date(postsMap[sc].downloadedAt)) {
                postsMap[sc].downloadedAt = item.downloadedAt;
            }
        });
        const groupedList = Object.values(postsMap);
        groupedList.forEach(post => {
            post.items.sort((a, b) => {
                const idxA = getSlideIndex(a.filename);
                const idxB = getSlideIndex(b.filename);
                if (idxA !== idxB) return idxA - idxB;
                return a.filename.localeCompare(b.filename);
            });
            post.fileSize = post.items.reduce((sum, it) => sum + it.fileSize, 0);
        });
        return groupedList;
    }

    // Selectors
    const galleryStories = document.getElementById('gallery-stories');
    const galleryMasonry = document.getElementById('gallery-masonry');
    const galleryTypePills = document.querySelectorAll('#gallery-type-pills button');
    const gallerySortInput = document.getElementById('gallery-sort');
    const galleryItemsCount = document.getElementById('gallery-items-count');
    const galleryProfilesCount = document.getElementById('gallery-profiles-count');
    
    // Gallery Sort Custom Dropdown Selectors
    const gallerySortDropdown = document.getElementById('gallery-sort-dropdown');
    const gallerySortTrigger = document.getElementById('gallery-sort-trigger');
    const gallerySortSelectedText = document.getElementById('gallery-sort-selected-text');
    const gallerySortChevron = document.getElementById('gallery-sort-chevron');
    const gallerySortOptions = document.getElementById('gallery-sort-options');
    
    // Lightbox Selectors
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const lightboxUsername = document.getElementById('lightbox-username');
    const lightboxShortcode = document.getElementById('lightbox-shortcode');
    const lightboxDate = document.getElementById('lightbox-date');
    const lightboxSize = document.getElementById('lightbox-size');
    const lightboxPath = document.getElementById('lightbox-path');
    const lightboxAvatar = document.getElementById('lightbox-avatar');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    async function loadGallery() {
        try {
            // Retrieve all downloads from system history
            const res = await fetch('/api/downloads?limit=1000');
            galleryData = await res.json();
            
            // Compute grouped posts from database records
            groupedPosts = groupMediaItems(galleryData);
            
            // Render Profile Stories Filter Bar
            renderStories();
            
            // Run initial display update
            updateGalleryDisplay();
        } catch (e) {
            console.error("Failed to fetch gallery items", e);
        }
    }

    function renderStories() {
        if (!galleryStories) return;
        
        // Find all unique usernames from database records
        const uniqueUsernames = [...new Set(galleryData.map(item => item.username))];
        
        // Update Profiles count badge
        if (galleryProfilesCount) {
            galleryProfilesCount.textContent = `${uniqueUsernames.length} profile${uniqueUsernames.length !== 1 ? 's' : ''}`;
        }
        
        galleryStories.innerHTML = '';
        
        // 1. Render "All Accounts" Story element
        const allStory = document.createElement('div');
        allStory.className = `story-avatar-container flex flex-col items-center gap-1.5 scroll-mx-4 ${activeUsernameFilter === null ? 'active' : ''}`;
        allStory.innerHTML = `
            <div class="story-ring-active">
                <div class="story-avatar-inner w-14 h-14 bg-gradient-to-tr from-accent-500 via-rose-500 to-amber-500 text-white font-extrabold flex items-center justify-center text-xs uppercase shadow-md leading-none select-none">
                    ALL
                </div>
            </div>
            <span class="text-[10px] font-bold text-slate-700 dark:text-slate-350 text-center tracking-tight truncate w-16 select-none">All Profiles</span>
        `;
        allStory.addEventListener('click', () => {
            activeUsernameFilter = null;
            document.querySelectorAll('.story-avatar-container').forEach(c => c.classList.remove('active'));
            allStory.classList.add('active');
            updateGalleryDisplay();
        });
        galleryStories.appendChild(allStory);
        
        // 2. Render each individual username circular stories
        uniqueUsernames.forEach(username => {
            const story = document.createElement('div');
            story.className = `story-avatar-container flex flex-col items-center gap-1.5 scroll-mx-4 ${activeUsernameFilter === username ? 'active' : ''}`;
            const initials = username.substring(0, 2).toUpperCase();
            
            // Random distinct premium gradient styles based on username characters
            const colors = [
                'from-pink-500 to-rose-500',
                'from-amber-400 to-orange-500',
                'from-emerald-400 to-teal-500',
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-500'
            ];
            const charSum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const gradient = colors[charSum % colors.length];
            
            story.innerHTML = `
                <div class="story-ring-active">
                    <div class="story-avatar-inner w-14 h-14 bg-gradient-to-tr ${gradient} text-white font-extrabold flex items-center justify-center text-xs uppercase shadow-md leading-none select-none">
                        ${initials}
                    </div>
                </div>
                <span class="text-[10px] font-bold text-slate-700 dark:text-slate-350 text-center tracking-tight truncate w-16 select-none">@${username}</span>
            `;
            
            story.addEventListener('click', () => {
                activeUsernameFilter = username;
                document.querySelectorAll('.story-avatar-container').forEach(c => c.classList.remove('active'));
                story.classList.add('active');
                updateGalleryDisplay();
            });
            galleryStories.appendChild(story);
        });
    }

    function getColumnCount() {
        const width = window.innerWidth;
        if (width >= 1024) return 4;
        if (width >= 768) return 3;
        if (width >= 640) return 2;
        return 1;
    }

    let lastColumnCount = getColumnCount();

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const handleResize = debounce(() => {
        const currentCols = getColumnCount();
        if (currentCols !== lastColumnCount) {
            lastColumnCount = currentCols;
            if (document.getElementById('gallery').classList.contains('active')) {
                updateGalleryDisplay();
            }
        }
    }, 150);

    window.addEventListener('resize', handleResize);

    function updateGalleryDisplay() {
        if (!galleryMasonry) return;
        
        // 1. Client-side Filter by Active Username
        let items = groupedPosts;
        if (activeUsernameFilter !== null) {
            items = items.filter(post => post.username === activeUsernameFilter);
        }
        
        // 2. Client-side Filter by Media Type
        if (activeTypeFilter !== 'all') {
            items = items.filter(post => {
                // Post is included if any of its items match the filtered type
                return post.items.some(item => {
                    const ext = item.filename.split('.').pop().toLowerCase();
                    const isVid = ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
                    return activeTypeFilter === 'video' ? isVid : !isVid;
                });
            });
        }
        
        // 3. Client-side Sorting Engine
        if (activeSort === 'newest') {
            items.sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));
        } else if (activeSort === 'oldest') {
            items.sort((a, b) => new Date(a.downloadedAt) - new Date(b.downloadedAt));
        } else if (activeSort === 'largest') {
            items.sort((a, b) => b.fileSize - a.fileSize);
        } else if (activeSort === 'smallest') {
            items.sort((a, b) => a.fileSize - b.fileSize);
        }
        
        filteredGalleryItems = items;
        
        // Update counters badge
        if (galleryItemsCount) {
            galleryItemsCount.textContent = `${items.length} post${items.length !== 1 ? 's' : ''}`;
        }
        
        galleryMasonry.innerHTML = '';
        
        if (items.length === 0) {
            galleryMasonry.className = "flex flex-col items-center justify-center py-20 w-full text-slate-400 dark:text-slate-500 font-medium";
            galleryMasonry.innerHTML = `
                <i data-lucide="image-off" class="w-12 h-12 text-slate-300 dark:text-slate-655 mb-3"></i>
                <span>No media items found matching current filters.</span>
            `;
            lucide.createIcons();
            return;
        }
        
        // Set flex layout wrapper
        galleryMasonry.className = "flex w-full gap-6";
        
        const cols = getColumnCount();
        const colElements = [];
        for (let i = 0; i < cols; i++) {
            const colDiv = document.createElement('div');
            colDiv.className = "flex-1 flex flex-col gap-6 min-w-0";
            galleryMasonry.appendChild(colDiv);
            colElements.push(colDiv);
        }
        
        items.forEach((post, index) => {
            const coverItem = post.items[0];
            const ext = coverItem.filename.split('.').pop().toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
            const mediaUrl = `/api/media/${coverItem.relativePath}`;
            
            const card = document.createElement('div');
            card.className = "rounded-2xl overflow-hidden relative group transition-all duration-300 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md cursor-pointer gallery-card";
            
            let mediaTagHTML = '';
            if (isVideo) {
                mediaTagHTML = `
                    <video class="w-full h-auto object-cover max-h-[380px] pointer-events-none" muted playsinline>
                        <source src="${mediaUrl}" type="video/mp4">
                    </video>
                    <!-- Video Badge Overlay -->
                    <div class="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center z-10">
                        <i data-lucide="play" class="w-3.5 h-3.5 fill-white ml-0.5"></i>
                    </div>
                `;
            } else {
                mediaTagHTML = `
                    <img class="w-full h-auto object-cover max-h-[380px]" src="${mediaUrl}" alt="Scraped post" loading="lazy">
                `;
            }
            
            // Carousel indicator pill overlay
            let carouselBadgeHTML = '';
            if (post.items.length > 1) {
                carouselBadgeHTML = `
                    <div class="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 text-[10px] font-extrabold z-10 select-none shadow-sm transition-all group-hover:bg-slate-950/85">
                        <i data-lucide="layers" class="w-3.5 h-3.5 text-accent-400"></i>
                        <span>1 of ${post.items.length}</span>
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="relative overflow-hidden w-full select-none">
                    ${mediaTagHTML}
                    ${carouselBadgeHTML}
                    
                    <!-- Hover Instagram details overlay -->
                    <div class="absolute inset-0 gallery-overlay-bloom flex flex-col justify-end p-4 text-white z-10">
                        <div class="space-y-1.5 w-full">
                            <span class="text-[9px] uppercase tracking-wider font-extrabold text-accent-400 font-mono">shortcode: ${post.shortcode}</span>
                            <h5 class="font-display font-extrabold text-sm truncate">@${post.username}</h5>
                            <div class="flex items-center justify-between text-[10px] text-slate-350 font-bold leading-none pt-2 border-t border-white/10 mt-1">
                                <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(post.downloadedAt).toLocaleDateString()}</span>
                                <span class="font-mono text-[9px]">${formatBytes(post.fileSize)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                openLightbox(index, 0);
            });
            
            const colIndex = index % cols;
            colElements[colIndex].appendChild(card);
        });
        
        lucide.createIcons();
    }

    function openLightbox(index, slideIndex = 0) {
        if (index < 0 || index >= filteredGalleryItems.length) return;
        currentGroupedPostIndex = index;
        
        const post = filteredGalleryItems[index];
        if (!post.items || post.items.length === 0) return;
        
        if (slideIndex < 0) slideIndex = 0;
        if (slideIndex >= post.items.length) slideIndex = post.items.length - 1;
        currentSlideIndex = slideIndex;
        
        const item = post.items[slideIndex];
        const ext = item.filename.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
        const mediaUrl = `/api/media/${item.relativePath}`;
        
        // Reset and display corresponding tag
        if (isVideo) {
            lightboxImg.classList.add('hidden');
            lightboxVideo.classList.remove('hidden');
            lightboxVideo.src = mediaUrl;
            lightboxVideo.load();
            lightboxVideo.play().catch(e => console.log('Video autoplay blocked/interrupted'));
        } else {
            lightboxVideo.classList.add('hidden');
            lightboxVideo.pause();
            lightboxVideo.src = '';
            lightboxImg.classList.remove('hidden');
            lightboxImg.src = mediaUrl;
        }
        
        // Show/hide inside-post navigation arrows
        if (lightboxPrev && lightboxNext) {
            if (post.items.length > 1) {
                lightboxPrev.classList.remove('hidden');
                lightboxNext.classList.remove('hidden');
            } else {
                lightboxPrev.classList.add('hidden');
                lightboxNext.classList.add('hidden');
            }
        }
        
        // Render Instagram Carousel Dots Pagination
        const dotsContainer = document.getElementById('lightbox-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            if (post.items.length > 1) {
                dotsContainer.classList.remove('hidden');
                for (let i = 0; i < post.items.length; i++) {
                    const dot = document.createElement('div');
                    dot.className = `carousel-dot ${i === slideIndex ? 'active' : ''}`;
                    dot.addEventListener('click', (e) => {
                        e.stopPropagation(); // prevent background clicks
                        openLightbox(index, i);
                    });
                    dotsContainer.appendChild(dot);
                }
            } else {
                dotsContainer.classList.add('hidden');
            }
        }
        
        // Write metadata
        if (lightboxUsername) lightboxUsername.textContent = `@${post.username}`;
        if (lightboxShortcode) {
            if (post.items.length > 1) {
                lightboxShortcode.textContent = `Shortcode: ${post.shortcode} (${slideIndex + 1} of ${post.items.length})`;
            } else {
                lightboxShortcode.textContent = `Shortcode: ${post.shortcode}`;
            }
        }
        if (lightboxDate) lightboxDate.textContent = formatDate(item.downloadedAt);
        if (lightboxSize) lightboxSize.textContent = formatBytes(item.fileSize);
        if (lightboxPath) lightboxPath.textContent = item.localPath;
        if (lightboxAvatar) lightboxAvatar.textContent = post.username.substring(0, 2).toUpperCase();
        
        // Style initials backgrounds randomly in drawer to match Stories style!
        const colors = [
            'bg-pink-500/10 text-pink-500',
            'bg-orange-500/10 text-orange-500',
            'bg-emerald-500/10 text-emerald-500',
            'bg-indigo-500/10 text-indigo-500',
            'bg-purple-500/10 text-purple-500'
        ];
        const charSum = post.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        lightboxAvatar.className = `w-10 h-10 shrink-0 rounded-full font-extrabold flex items-center justify-center shadow-inner font-display uppercase ${colors[charSum % colors.length]}`;
        
        // Set visibility classes safely and lock body scrolling
        if (lightbox) {
            lightbox.classList.remove('opacity-0', 'invisible');
            lightbox.classList.add('opacity-100', 'visible', 'active');
        }

        const scrollContent = document.getElementById('main-scroll-content');
        if (scrollContent) {
            scrollContent.classList.add('overflow-hidden');
            scrollContent.classList.remove('overflow-y-auto');
        }
        
        lucide.createIcons();
    }

    function closeLightbox() {
        if (lightbox) {
            lightbox.classList.add('opacity-0', 'invisible');
            lightbox.classList.remove('opacity-100', 'visible', 'active');
        }
        
        const scrollContent = document.getElementById('main-scroll-content');
        if (scrollContent) {
            scrollContent.classList.remove('overflow-hidden');
            scrollContent.classList.add('overflow-y-auto');
        }

        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxImg.src = '';
        currentGroupedPostIndex = -1;
        currentSlideIndex = -1;
    }

    function navigateLightbox(dir) {
        if (currentGroupedPostIndex < 0 || currentGroupedPostIndex >= filteredGalleryItems.length) return;
        
        const post = filteredGalleryItems[currentGroupedPostIndex];
        let newSlideIndex = currentSlideIndex + dir;
        
        if (newSlideIndex < 0) {
            // Wrap to the last slide of the same post
            openLightbox(currentGroupedPostIndex, post.items.length - 1);
        } else if (newSlideIndex >= post.items.length) {
            // Wrap to the first slide of the same post
            openLightbox(currentGroupedPostIndex, 0);
        } else {
            // Switch slide inside the active post carousel
            openLightbox(currentGroupedPostIndex, newSlideIndex);
        }
    }

    // Register active filters & controls event listeners
    if (galleryTypePills) {
        galleryTypePills.forEach(pill => {
            pill.addEventListener('click', () => {
                galleryTypePills.forEach(p => {
                    p.className = "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-accent-500 transition-all";
                });
                pill.className = "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border border-accent-500/20 dark:border-accent-500/30 bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/15 transition-all";
                
                activeTypeFilter = pill.getAttribute('data-type');
                updateGalleryDisplay();
            });
        });
    }

    const sortTexts = {
        'newest': 'Newest Saved',
        'oldest': 'Oldest Saved',
        'largest': 'Largest Size',
        'smallest': 'Smallest Size'
    };

    window.syncGallerySortSelect = function(val) {
        if (!gallerySortInput) return;
        gallerySortInput.value = val;
        activeSort = val;
        
        // Update Trigger Button Text
        if (gallerySortSelectedText) {
            gallerySortSelectedText.textContent = sortTexts[val] || val;
        }

        // Update active class on option buttons
        const optionButtons = document.querySelectorAll('.gallery-sort-opt');
        optionButtons.forEach(opt => {
            if (opt.getAttribute('data-val') === val) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        updateGalleryDisplay();
    };

    if (gallerySortTrigger && gallerySortOptions) {
        // Toggle dropdown open/close
        gallerySortTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close setting dropdown if open to avoid conflicts
            if (window.closeCustomDropdown) window.closeCustomDropdown();
            
            const isOpen = !gallerySortOptions.classList.contains('invisible');
            if (isOpen) {
                window.closeGalleryDropdown();
            } else {
                openGalleryDropdown();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (gallerySortDropdown && !gallerySortDropdown.contains(e.target)) {
                window.closeGalleryDropdown();
            }
        });

        // Click option buttons to select
        const optionButtons = document.querySelectorAll('.gallery-sort-opt');
        optionButtons.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const val = opt.getAttribute('data-val');
                window.syncGallerySortSelect(val);
                window.closeGalleryDropdown();
            });
        });
    }

    function openGalleryDropdown() {
        if (!gallerySortOptions) return;
        gallerySortOptions.classList.remove('opacity-0', 'invisible', 'scale-95');
        gallerySortOptions.classList.add('opacity-100', 'visible', 'scale-100');
        if (gallerySortChevron) gallerySortChevron.classList.add('rotate-180');
    }

    window.closeGalleryDropdown = function() {
        if (!gallerySortOptions) return;
        gallerySortOptions.classList.remove('opacity-100', 'visible', 'scale-100');
        gallerySortOptions.classList.add('opacity-0', 'invisible', 'scale-95');
        if (gallerySortChevron) gallerySortChevron.classList.remove('rotate-180');
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox(1));
    
    // Close modal on clicking outside inner modal card
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
    
    // Bind Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (!lightbox || lightbox.classList.contains('invisible')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });

    // ─── Initialization ──────────────────────────────────────────────────────
    loadSettings();
    loadStats();
    
    // Auto-refresh dashboard metrics & live active extension logs in responsive 1.0s cycles
    setInterval(() => {
        loadStats();
        
        const downloadsView = document.getElementById('downloads');
        if (downloadsView && downloadsView.classList.contains('active')) {
            const panelSkipped = document.getElementById('panel-skipped');
            if (panelSkipped && !panelSkipped.classList.contains('hidden')) {
                loadSkipped();
            } else {
                loadDownloads();
            }
        }
    }, 1000);
});

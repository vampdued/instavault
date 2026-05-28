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
    
    // Read from localStorage (default: expanded)
    const isSidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    applySidebarState(isSidebarCollapsed);
    
    sidebarToggle.addEventListener('click', () => {
        const collapsedState = !sidebar.classList.contains('collapsed');
        applySidebarState(collapsedState);
        localStorage.setItem('sidebar-collapsed', collapsedState);
    });

    // Mobile Responsive Sidebar Toggler
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Dismiss sidebar when tapping viewport outside on mobile screens
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && !sidebar.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
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
    const navLinks = document.querySelectorAll('nav a');
    const views = document.querySelectorAll('.view');
    const headerTitle = document.getElementById('active-view-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Sync Header Navigation Text
            if (headerTitle) {
                const labelText = link.querySelector('.sidebar-label').textContent;
                headerTitle.textContent = labelText;
            }

            // Slide out sidebar on mobile click
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
            }

            // Refresh view data
            if (targetView === 'dashboard') loadStats();
            if (targetView === 'gallery') loadGallery();
            if (targetView === 'downloads') loadDownloads();
            if (targetView === 'skipped') loadSkipped();
            if (targetView === 'settings') loadSettings();
        });
    });

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

                const formatBytes = (bytes) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };

                const totalStr = formatBytes(total);
                const freeStr = formatBytes(free);
                const usedStr = formatBytes(used);

                const textEl = document.getElementById('stat-disk-text');
                const percentEl = document.getElementById('stat-disk-percent');
                const freeEl = document.getElementById('stat-disk-free');
                const barEl = document.getElementById('stat-disk-bar');

                if (textEl) textEl.textContent = `${usedStr} / ${totalStr}`;
                if (percentEl) percentEl.textContent = `${percentUsed}% used`;
                if (freeEl) freeEl.textContent = `${freeStr} free`;
                if (barEl) barEl.style.width = `${percentUsed}%`;
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

            // Handle Live Terminal Sync Console
            const consoleStatusBadge = document.getElementById('console-status-badge');
            const consoleStatusText = document.getElementById('console-status-text');
            const consolePing = document.getElementById('console-ping');
            const consoleDot = document.getElementById('console-dot');
            const consoleFeed = document.getElementById('live-console-feed');

            if (data.activeSync) {
                const isActive = data.activeSync.isActive;
                
                // Update Console Status Badge Aesthetics
                if (consoleStatusBadge && consoleStatusText) {
                    if (isActive) {
                        consoleStatusBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all duration-300 animate-pulse";
                        consoleStatusText.textContent = "ACTIVE SYNC";
                        if (consolePing) {
                            consolePing.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
                        }
                        if (consoleDot) {
                            consoleDot.className = "relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500";
                        }
                    } else {
                        consoleStatusBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-300";
                        consoleStatusText.textContent = "IDLE";
                        if (consolePing) {
                            consolePing.className = "absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75";
                        }
                        if (consoleDot) {
                            consoleDot.className = "relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500";
                        }
                    }
                }

                // Render Live Terminal Log Stream
                if (consoleFeed) {
                    const logs = data.activeSync.liveLogs || [];
                    if (logs.length > 0) {
                        const isScrolledToBottom = consoleFeed.scrollHeight - consoleFeed.clientHeight <= consoleFeed.scrollTop + 30;

                        consoleFeed.innerHTML = '<div class="text-slate-600 font-bold border-b border-slate-900 pb-1.5 mb-2 flex items-center justify-between"><span>// InstaVault Live Console v1.1.0</span><span class="text-[9px] uppercase tracking-wider text-slate-500">' + (isActive ? '🟢 streaming' : '⚪ ready') + '</span></div>';
                        
                        logs.forEach(log => {
                            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            
                            let statusBadge = '';
                            let lineClass = 'text-slate-350';
                            
                            if (log.status === 'downloading') {
                                statusBadge = '<span class="text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase animate-pulse flex items-center gap-1 shrink-0"><i data-lucide="loader" class="w-2.5 h-2.5 animate-spin inline"></i> DL</span>';
                                lineClass = 'text-blue-400/90';
                            } else if (log.status === 'completed') {
                                statusBadge = '<span class="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase shrink-0">✅ OK</span>';
                                lineClass = 'text-emerald-400/95 font-medium';
                            } else if (log.status === 'skipped') {
                                statusBadge = '<span class="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase shrink-0">⏭️ SKIP</span>';
                                lineClass = 'text-amber-400/90';
                            } else if (log.status === 'failed') {
                                statusBadge = `<span class="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase shrink-0" title="${log.error || ''}">❌ ERR</span>`;
                                lineClass = 'text-rose-400/90 font-medium';
                            }

                            const filenameTrunc = log.filename.length > 50 ? log.filename.substring(0, 47) + '...' : log.filename;
                            
                            const logLine = document.createElement('div');
                            logLine.className = `flex items-center justify-between gap-3 text-[10.5px] py-1 border-b border-slate-900/50 hover:bg-slate-900/20 px-1 rounded transition-colors ${lineClass}`;
                            logLine.innerHTML = `
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="text-slate-650 shrink-0 font-light">[${timeStr}]</span>
                                    <span class="text-emerald-600/90 shrink-0 font-bold">@${log.username}</span>
                                    <span class="truncate font-semibold" title="${log.filename}">${filenameTrunc}</span>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    ${log.status === 'completed' ? `<span class="text-[9px] text-slate-500 font-mono font-bold">${formatBytes(log.size)}</span>` : ''}
                                    ${statusBadge}
                                </div>
                            `;
                            consoleFeed.appendChild(logLine);
                        });

                        lucide.createIcons();

                        if (isScrolledToBottom || isActive) {
                            consoleFeed.scrollTop = consoleFeed.scrollHeight;
                        }
                    } else {
                        consoleFeed.innerHTML = `
                            <div class="text-slate-650 font-bold border-b border-slate-900 pb-1.5 mb-2">// InstaVault Live Console v1.1.0</div>
                            <div class="text-slate-650 font-bold">// Listening for incoming browser extension data...</div>
                            <div class="text-slate-700 italic text-[10px] mt-2 border-t border-slate-900 pt-2">Awaiting active scrape stream from Instagram client...</div>
                        `;
                    }
                }
            }

            const accRes = await fetch('/api/accounts');
            const accounts = await accRes.json();
            
            const tbody = document.querySelector('#accounts-table tbody');
            tbody.innerHTML = '';
            
            if (accounts.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="2" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <i data-lucide="inbox" class="w-8 h-8 text-slate-350 dark:text-slate-655"></i>
                                <span>No download data captured yet.</span>
                            </div>
                        </td>
                    </tr>`;
                lucide.createIcons();
                return;
            }

            accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150";
                tr.innerHTML = `
                    <td class="py-4 px-6 font-semibold text-slate-850 dark:text-slate-200">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-brand-100/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                ${acc.username.substring(0, 2)}
                            </div>
                            <span class="hover:text-brand-500 transition-colors cursor-pointer">@${acc.username}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-100/30 dark:border-brand-500/20 shadow-sm">
                            ${acc.count} Items
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
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
                        <span class="hover:text-brand-500 transition-colors cursor-pointer">@${item.username}</span>
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
                        <button class="force-dl-btn px-3 py-1.5 rounded-lg text-xs font-bold text-brand-650 dark:text-brand-400 hover:bg-brand-500/10 active:scale-95 border border-brand-500/20 dark:border-brand-500/30 bg-brand-500/5 transition-all inline-flex items-center gap-1.5" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i> Clear Bypassed Entry
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
                            button.classList.remove('text-brand-650', 'dark:text-brand-400', 'hover:bg-brand-500/10', 'border-brand-500/20');
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
                btn.classList.remove('from-brand-600', 'to-indigo-600');
                btn.classList.add('bg-emerald-650');
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('bg-emerald-650');
                    btn.classList.add('from-brand-600', 'to-indigo-600');
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
                <div class="story-avatar-inner w-14 h-14 bg-gradient-to-tr from-brand-500 to-indigo-500 text-white font-extrabold flex items-center justify-center text-xs uppercase shadow-md leading-none select-none">
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
        
        // Restore column layout classes if previously removed
        galleryMasonry.className = "columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 w-full space-y-6";
        
        items.forEach((post, index) => {
            const coverItem = post.items[0];
            const ext = coverItem.filename.split('.').pop().toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
            const mediaUrl = `/api/media/${coverItem.relativePath}`;
            
            const card = document.createElement('div');
            card.className = "break-inside-avoid mb-6 rounded-2xl overflow-hidden relative group transition-all duration-300 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md cursor-pointer gallery-card";
            
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
                    <div class="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-slate-955/65 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 text-[10px] font-extrabold z-10 select-none shadow-sm transition-all group-hover:bg-slate-950/80">
                        <i data-lucide="layers" class="w-3.5 h-3.5 text-brand-400"></i>
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
                            <span class="text-[9px] uppercase tracking-wider font-extrabold text-brand-400 font-mono">shortcode: ${post.shortcode}</span>
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
            
            galleryMasonry.appendChild(card);
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
                    p.className = "px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-brand-500 transition-all";
                });
                pill.className = "px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer border border-brand-500/20 dark:border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/15 transition-all";
                
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
        
        if (document.getElementById('downloads').classList.contains('active')) {
            loadDownloads();
        }
        if (document.getElementById('skipped').classList.contains('active')) {
            loadSkipped();
        }
    }, 1000);
});

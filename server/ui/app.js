document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    const themeBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    // Set theme initial state
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggler(savedTheme);

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggler(newTheme);
    });

    function updateThemeToggler(theme) {
        const textSpan = document.querySelector('.theme-text');
        if (textSpan) {
            textSpan.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
        // Force Lucide to update the icons in the toggler button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // State Management
    let currentBaseDir = '';
    
    // Pagination States
    let downloadsPage = 1;
    const downloadsLimit = 15;
    
    let skippedPage = 1;
    const skippedLimit = 15;
    
    let galleryPage = 1;
    const galleryLimit = 24; // Expanded for rich 3-column instagram rows
    let gallerySearchQuery = '';
    
    // Instagram Mimic States
    let selectedAccount = ''; // '' means "All Media"
    let galleryActiveTab = 'posts'; // 'posts' or 'reels'

    // Navigation setup
    const navLinks = document.querySelectorAll('nav a');
    const views = document.querySelectorAll('.view');
    const sidebar = document.querySelector('.sidebar');

    // Create sidebar overlay for mobile layout
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Instagram Mimic Tab Selector Controls
    const tabButtons = document.querySelectorAll('.instagram-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            galleryActiveTab = btn.getAttribute('data-tab');
            galleryPage = 1;
            loadGallery();
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Close sidebar overlay on mobile navigation clicks
            sidebar.classList.remove('active');
            overlay.classList.remove('active');

            // Refresh data on view switch
            if (targetView === 'dashboard') loadStats();
            if (targetView === 'gallery') {
                galleryPage = 1;
                loadGallery();
            }
            if (targetView === 'downloads') {
                downloadsPage = 1;
                loadDownloads();
            }
            if (targetView === 'skipped') {
                skippedPage = 1;
                loadSkipped();
            }
            if (targetView === 'settings') loadSettings();
        });
    });

    // Format bytes helper
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // Format date helper
    function formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    }

    // Get relative path for media endpoint
    function getMediaUrl(localPath, username, filename) {
        if (!localPath) return '';
        
        let relPath = localPath;
        if (currentBaseDir) {
            // Remove base directory prefix to get relative path inside baseDir
            relPath = localPath.replace(currentBaseDir, '');
        }
        
        // Normalize backslashes (Windows paths) to forward slashes for URLs
        relPath = relPath.replace(/\\/g, '/');
        
        // Remove leading slash if present
        if (relPath.startsWith('/')) {
            relPath = relPath.substring(1);
        }
        
        return `/media/${relPath}`;
    }

    // Check if filename indicates a video file
    function isVideoFile(filename) {
        if (!filename) return false;
        const ext = filename.split('.').pop().toLowerCase();
        return ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext);
    }

    // Trigger Lucide SVG replacements helper
    function refreshIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Load base directory settings on startup
    async function initApp() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                currentBaseDir = data.baseDir;
            }
            // Load dashboard stats initially
            loadStats();
        } catch (e) {
            console.error('Initialization failed', e);
        }
        refreshIcons();
    }

    // Load Dashboard Stats
    async function loadStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('stat-total-dl').textContent = data.totalDownloads || 0;
            document.getElementById('stat-total-skipped').textContent = data.totalSkipped || 0;
            document.getElementById('stat-unique-accounts').textContent = data.uniqueAccounts || 0;

            const accRes = await fetch('/api/accounts');
            const accounts = await accRes.json();
            
            const tbody = document.querySelector('#accounts-table tbody');
            tbody.innerHTML = '';
            
            if (accounts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-muted">No downloads yet.</td></tr>';
                refreshIcons();
                return;
            }

            accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${acc.username}</strong></td>
                    <td><span class="btn btn-small btn-secondary" style="padding: 4px 10px; cursor: default; box-shadow: none;">${acc.count} files</span></td>
                `;
                tbody.appendChild(tr);
            });
            
            refreshIcons();
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // Load Interactive Media Gallery
    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');
        const storiesTrack = document.getElementById('stories-track');
        const profileCard = document.getElementById('instagram-profile-card');
        const subtitle = document.getElementById('gallery-subtitle');

        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;" class="text-muted">Loading your media vault...</div>';

        try {
            // 1. Fetch accounts to populate Stories Carousel
            const accRes = await fetch('/api/accounts');
            const accounts = await accRes.json();

            // Populate stories carousel
            storiesTrack.innerHTML = '';
            
            // "All" Story Circle
            const allStory = document.createElement('div');
            allStory.className = `story-circle all-media ${selectedAccount === '' ? 'active' : ''}`;
            allStory.innerHTML = `
                <div class="story-avatar-wrapper">
                    <div class="story-avatar-inside">ALL</div>
                </div>
                <div class="story-username">All Vault</div>
            `;
            allStory.addEventListener('click', () => {
                selectedAccount = '';
                galleryPage = 1;
                loadGallery();
            });
            storiesTrack.appendChild(allStory);

            // Accounts Story Circles
            let activeAccountObj = null;
            accounts.forEach(acc => {
                const isActive = selectedAccount === acc.username;
                if (isActive) activeAccountObj = acc;
                
                const story = document.createElement('div');
                story.className = `story-circle ${isActive ? 'active' : ''}`;
                
                const initial = acc.username.substring(0, 2).toUpperCase();
                story.innerHTML = `
                    <div class="story-avatar-wrapper">
                        <div class="story-avatar-inside">${initial}</div>
                    </div>
                    <div class="story-username">@${acc.username}</div>
                `;
                story.addEventListener('click', () => {
                    selectedAccount = acc.username;
                    galleryPage = 1;
                    loadGallery();
                });
                storiesTrack.appendChild(story);
            });

            // 2. Adjust Profile Card display
            if (selectedAccount === '') {
                profileCard.style.display = 'none';
                subtitle.textContent = gallerySearchQuery ? `Searching All Media: "${gallerySearchQuery}"` : 'Browsing All Vault Media';
            } else {
                profileCard.style.display = 'flex';
                subtitle.textContent = gallerySearchQuery ? `Searching @${selectedAccount}: "${gallerySearchQuery}"` : `Browsing @${selectedAccount}`;
                
                // Update profile card details
                document.getElementById('profile-username-val').textContent = selectedAccount;
                document.getElementById('profile-fullname-val').textContent = `@${selectedAccount} Archive`;
                document.getElementById('profile-avatar-char').textContent = selectedAccount.substring(0, 1).toUpperCase();
                document.getElementById('profile-stat-posts').textContent = activeAccountObj ? activeAccountObj.count : 0;
                
                const folderLink = document.getElementById('profile-bio-path');
                const userPath = currentBaseDir ? `${currentBaseDir}/${selectedAccount}` : '';
                folderLink.textContent = `Folder: ${userPath || 'Instagram/' + selectedAccount}`;
                folderLink.title = userPath;
            }

            // 3. Query local media downloads
            let url = `/api/downloads?page=${galleryPage}&limit=${galleryLimit}`;
            // If filtering by selected account, append to url query
            if (selectedAccount !== '') {
                url += `&username=${encodeURIComponent(selectedAccount)}`;
            } else if (gallerySearchQuery) {
                // Otherwise support general searches
                url += `&username=${encodeURIComponent(gallerySearchQuery)}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            
            grid.innerHTML = '';

            // 4. Client-side filter: Separating POSTS (Images) from REELS (Videos)
            const filteredData = data.filter(item => {
                const isVid = isVideoFile(item.filename);
                return galleryActiveTab === 'reels' ? isVid : !isVid;
            });
            
            if (filteredData.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px;" class="text-muted">
                    <h3>No items found in this section</h3>
                    <p style="margin-top: 8px; font-size: 0.9rem;">${selectedAccount ? 'Try switching tabs or adjusting filters.' : 'Your download vault is empty.'}</p>
                </div>`;
                setupPaginationButtons('gallery', 0, galleryPage);
                refreshIcons();
                return;
            }

            filteredData.forEach(item => {
                const card = document.createElement('div');
                card.className = 'media-card';
                
                const mediaUrl = getMediaUrl(item.localPath, item.username, item.filename);
                const isVideo = isVideoFile(item.filename);
                const fileExt = item.filename.split('.').pop().toUpperCase();
                
                // Deterministic mock likes and comments based on filename hash to keep them persistent
                const hash = item.filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const likes = (hash * 7) % 850 + 42;
                const comments = (hash * 3) % 85 + 5;

                card.innerHTML = `
                    <div class="media-preview-container">
                        <!-- Instagram post hover overlays -->
                        <div class="instagram-hover-overlay">
                            <div class="instagram-hover-item">
                                <i data-lucide="heart"></i>
                                <span>${likes}</span>
                            </div>
                            <div class="instagram-hover-item">
                                <i data-lucide="message-circle"></i>
                                <span>${comments}</span>
                            </div>
                        </div>
                        <span class="media-badge" style="z-index: 10;">${isVideo ? 'Video' : fileExt}</span>
                        ${isVideo ? 
                            `<video src="${mediaUrl}" preload="metadata" muted></video>` : 
                            `<img src="${mediaUrl}" alt="${item.filename}" loading="lazy">`
                        }
                    </div>
                    <div class="media-info">
                        <span class="media-user">@${item.username}</span>
                        <span class="media-filename" title="${item.filename}">${item.filename}</span>
                    </div>
                `;
                
                // Open immersive lightbox on card click
                card.addEventListener('click', () => openLightbox(item, mediaUrl, isVideo));
                grid.appendChild(card);
            });

            // Set dynamic stats next indicator count based on filtered elements size
            setupPaginationButtons('gallery', data.length, galleryPage);
            refreshIcons();

        } catch (e) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">Failed to connect to local media. Make sure server is active.</div>';
            console.error('Failed to load gallery', e);
        }
    }

    // Load Downloads Log (Table View)
    async function loadDownloads() {
        try {
            const res = await fetch(`/api/downloads?page=${downloadsPage}&limit=${downloadsLimit}`);
            const data = await res.json();
            
            const tbody = document.querySelector('#downloads-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No downloads found.</td></tr>';
                setupPaginationButtons('downloads', 0, downloadsPage);
                refreshIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                const mediaUrl = getMediaUrl(item.localPath, item.username, item.filename);
                const isVideo = isVideoFile(item.filename);

                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.downloadedAt)}</td>
                    <td><strong style="color: var(--accent);">@${item.username}</strong></td>
                    <td style="cursor: pointer; font-weight: 500;" class="preview-trigger">${item.filename} 👁️</td>
                    <td class="text-muted">${formatBytes(item.fileSize)}</td>
                    <td class="text-muted" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.localPath}">${item.localPath}</td>
                `;

                // Add lightbox preview to table filename click
                tr.querySelector('.preview-trigger').addEventListener('click', () => openLightbox(item, mediaUrl, isVideo));
                tbody.appendChild(tr);
            });

            setupPaginationButtons('downloads', data.length, downloadsPage);
            refreshIcons();

        } catch (e) {
            console.error('Failed to load downloads log', e);
        }
    }

    // Load Skipped Duplicates (Table View)
    async function loadSkipped() {
        try {
            const res = await fetch(`/api/skipped?page=${skippedPage}&limit=${skippedLimit}`);
            const data = await res.json();
            
            const tbody = document.querySelector('#skipped-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No skipped items.</td></tr>';
                setupPaginationButtons('skipped', 0, skippedPage);
                refreshIcons();
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.skippedAt)}</td>
                    <td><strong>@${item.username}</strong></td>
                    <td>${item.filename}</td>
                    <td class="text-muted"><span style="color: var(--accent); background: rgba(244, 63, 145, 0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Already Exists</span></td>
                    <td>
                        <button class="btn btn-small btn-secondary force-dl-btn" data-id="${item.id}" data-shortcode="${item.shortcode}" data-filename="${item.filename}" data-username="${item.username}">
                            <i data-lucide="refresh-cw" style="width: 12px; height: 12px; margin-right: 4px;"></i>
                            <span>Reset Dupe</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Concurrency-safe reset skip handler
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    const textSpan = button.querySelector('span');
                    const originalText = textSpan.textContent;
                    textSpan.textContent = 'Clearing...';
                    button.disabled = true;

                    try {
                        const id = button.getAttribute('data-id');
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            textSpan.textContent = 'Reset Complete!';
                            button.style.backgroundColor = 'var(--success)';
                            button.style.color = '#fff';
                            setTimeout(() => loadSkipped(), 1200);
                        } else {
                            throw new Error('Failed to reset skip entry');
                        }
                    } catch (err) {
                        console.error(err);
                        textSpan.textContent = 'Error';
                        button.disabled = false;
                    }
                });
            });

            setupPaginationButtons('skipped', data.length, skippedPage);
            refreshIcons();

        } catch (e) {
            console.error('Failed to load skipped log', e);
        }
    }

    // Pagination Helper Controls
    function setupPaginationButtons(type, count, currentPage) {
        const prevBtn = document.getElementById(`${type}-prev-btn`);
        const nextBtn = document.getElementById(`${type}-next-btn`);
        const pageInfo = document.getElementById(`${type}-page-info`);
        
        let limit = type === 'gallery' ? galleryLimit : (type === 'downloads' ? downloadsLimit : skippedLimit);
        
        pageInfo.textContent = `Page ${currentPage}`;
        
        // Previous page button state
        prevBtn.disabled = currentPage === 1;
        
        // Next page button state (heuristically enabled if returned data equals current fetch limit)
        nextBtn.disabled = count < limit;
    }

    // Handle Pagination Clicks
    document.getElementById('gallery-prev-btn').addEventListener('click', () => {
        if (galleryPage > 1) {
            galleryPage--;
            loadGallery();
        }
    });
    document.getElementById('gallery-next-btn').addEventListener('click', () => {
        galleryPage++;
        loadGallery();
    });

    document.getElementById('downloads-prev-btn').addEventListener('click', () => {
        if (downloadsPage > 1) {
            downloadsPage--;
            loadDownloads();
        }
    });
    document.getElementById('downloads-next-btn').addEventListener('click', () => {
        downloadsPage++;
        loadDownloads();
    });

    document.getElementById('skipped-prev-btn').addEventListener('click', () => {
        if (skippedPage > 1) {
            skippedPage--;
            loadSkipped();
        }
    });
    document.getElementById('skipped-next-btn').addEventListener('click', () => {
        skippedPage++;
        loadSkipped();
    });

    // Gallery Search Handler
    const searchInput = document.getElementById('gallery-search');
    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            gallerySearchQuery = e.target.value.trim();
            galleryPage = 1;
            loadGallery();
        }, 400); // Debounce API calls by 400ms
    });

    // Immersive Lightbox Modal Handler
    const lightbox = document.getElementById('lightbox');
    const lightboxMedia = document.getElementById('lightbox-media-container');
    const lightboxCaption = document.getElementById('lightbox-caption');

    function openLightbox(item, mediaUrl, isVideo) {
        lightboxMedia.innerHTML = '';
        
        if (isVideo) {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.autoplay = true;
            video.style.outline = 'none';
            lightboxMedia.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = item.filename;
            lightboxMedia.appendChild(img);
        }

        // Setup captions
        lightboxCaption.querySelector('.main').textContent = item.filename;
        lightboxCaption.querySelector('.sub').textContent = `@${item.username} • Size: ${formatBytes(item.fileSize || 0)} • Logged: ${formatDate(item.downloadedAt || item.skippedAt)}`;

        lightbox.classList.add('active');
        refreshIcons();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        // Stop playing video if active
        const video = lightboxMedia.querySelector('video');
        if (video) {
            video.pause();
            video.src = '';
        }
        lightboxMedia.innerHTML = '';
    }

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    
    // Close lightbox on clicking dark backdrop
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.closest('.lightbox-close')) {
            closeLightbox();
        }
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Settings Configuration Loader
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.baseDir) {
                document.getElementById('base-dir').value = data.baseDir;
                currentBaseDir = data.baseDir;
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
        refreshIcons();
    }

    // Save Settings
    document.getElementById('save-settings').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const textSpan = btn.querySelector('span');
        const originalText = textSpan.textContent;
        const baseDir = document.getElementById('base-dir').value.trim();
        
        textSpan.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseDir })
            });
            if (res.ok) {
                currentBaseDir = baseDir;
                textSpan.textContent = 'Saved!';
                btn.style.backgroundColor = 'var(--success)';
                btn.style.color = '#fff';
                btn.style.boxShadow = 'none';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    btn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            alert('Error saving settings');
            textSpan.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Clear History Handlers
    document.getElementById('clear-downloads-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear your local downloads database log? Downloaded files on disk will NOT be affected.')) return;
        
        const btn = e.currentTarget;
        const textSpan = btn.querySelector('span');
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/downloads', { method: 'DELETE' });
            if (res.ok) {
                textSpan.textContent = 'Cleared!';
                downloadsPage = 1;
                loadDownloads();
                loadStats();
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing download logs');
            textSpan.textContent = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('clear-skipped-btn').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear your local duplicates log? Future downloads will no longer ignore these as duplicates.')) return;
        
        const btn = e.currentTarget;
        const textSpan = btn.querySelector('span');
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/skipped', { method: 'DELETE' });
            if (res.ok) {
                textSpan.textContent = 'Cleared!';
                skippedPage = 1;
                loadSkipped();
                loadStats();
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Failed to clear duplicates logs');
            }
        } catch (err) {
            console.error(err);
            alert('Error clearing duplicates logs');
            textSpan.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Initialize application settings & load default states
    initApp();
    
    // Auto-refresh Dashboard Stats every 15 seconds if active
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadStats();
        }
    }, 15000);
});

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
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // State Management
    let currentBaseDir = '';

    // Pagination States (Downloads Log & Skipped Duplicates)
    let downloadsPage = 1;
    const downloadsLimit = 15;

    let skippedPage = 1;
    const skippedLimit = 15;

    // Gallery Infinite Scroll States (Instagram Mimic)
    let galleryPage = 1;
    const galleryLimit = 24; // Expanded for comfortable 3-column rows
    let gallerySearchQuery = '';
    let galleryHasMore = true;
    let galleryLoading = false;
    let selectedAccount = ''; // '' means "All Media"
    let galleryActiveTab = 'posts'; // 'posts' or 'reels'

    // Carousel Lightbox States
    let currentPost = null;
    let currentMediaIndex = 0;

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
            loadGallery();
        });
    });

    // Routing Engine mapping URLs to SPA views via History API
    function navigateTo(targetView, replaceState = false) {
        const validViews = ['dashboard', 'gallery', 'downloads', 'skipped', 'settings'];
        if (!validViews.includes(targetView)) {
            targetView = 'dashboard';
        }

        // Update active class on Sidebar Links
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === targetView) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update active class on View Panels
        views.forEach(v => {
            if (v.id === targetView) {
                v.classList.add('active');
            } else {
                v.classList.remove('active');
            }
        });

        // Push history state if requested
        const path = targetView === 'dashboard' ? '/' : '/' + targetView;
        if (!replaceState) {
            window.history.pushState({ view: targetView }, '', path);
        }

        // Dismiss mobile menus if open
        sidebar.classList.remove('active');
        overlay.classList.remove('active');

        // Fetch/Refresh view data
        if (targetView === 'dashboard') loadStats();
        if (targetView === 'gallery') loadGallery();
        if (targetView === 'downloads') {
            downloadsPage = 1;
            loadDownloads();
        }
        if (targetView === 'skipped') {
            skippedPage = 1;
            loadSkipped();
        }
        if (targetView === 'settings') loadSettings();
    }

    // Bind link navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            navigateTo(targetView);
        });
    });

    // Handle Popstate (browser Back/Forward buttons)
    window.addEventListener('popstate', (e) => {
        const viewFromState = e.state && e.state.view;
        if (viewFromState) {
            navigateTo(viewFromState, true);
        } else {
            resolveRouteFromPathname();
        }
    });

    function resolveRouteFromPathname() {
        const path = window.location.pathname.replace(/^\/|\/$/g, '');
        navigateTo(path || 'dashboard', true);
    }

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
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString();
    }

    // Get relative path for media endpoint
    function getMediaUrl(localPath, username, filename) {
        if (!localPath) return '';

        let relPath = localPath;
        if (currentBaseDir) {
            relPath = localPath.replace(currentBaseDir, '');
        }

        relPath = relPath.replace(/\\/g, '/');

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
            // Resolve correct SPA route on initial page load
            resolveRouteFromPathname();
            // Start real-time logging
            initLiveLogs();
            // Initialize infinite scroll pre-fetching observer
            initInfiniteScroll();
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
                    <td><span class="btn btn-small btn-secondary" style="padding: 4px 10px; cursor: default; box-shadow: none;">${acc.count} posts</span></td>
                `;
                tbody.appendChild(tr);
            });

            refreshIcons();
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    }

    // Load Interactive Media Gallery
    async function loadGallery(append = false) {
        if (galleryLoading) return;

        const grid = document.getElementById('gallery-grid');
        const storiesTrack = document.getElementById('stories-track');
        const profileCard = document.getElementById('instagram-profile-card');
        const subtitle = document.getElementById('gallery-subtitle');
        const sentinel = document.getElementById('gallery-sentinel');

        if (!append) {
            galleryPage = 1;
            galleryHasMore = true;
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;" class="text-muted">Loading your media vault...</div>';
            if (sentinel) sentinel.style.display = 'none';
        }

        galleryLoading = true;
        if (sentinel) sentinel.style.display = 'flex';

        try {
            // 1. Fetch accounts to populate Stories Carousel (only initially)
            if (!append) {
                const accRes = await fetch('/api/accounts');
                const accounts = await accRes.json();

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

                    document.getElementById('profile-username-val').textContent = selectedAccount;
                    document.getElementById('profile-fullname-val').textContent = `@${selectedAccount} Archive`;
                    document.getElementById('profile-avatar-char').textContent = selectedAccount.substring(0, 1).toUpperCase();
                    document.getElementById('profile-stat-posts').textContent = activeAccountObj ? activeAccountObj.count : 0;

                    const folderLink = document.getElementById('profile-bio-path');
                    const userPath = currentBaseDir ? `${currentBaseDir}/${selectedAccount}` : '';
                    folderLink.textContent = `Folder: ${userPath || 'Instagram/' + selectedAccount}`;
                    folderLink.title = userPath;
                }
            }

            // 3. Query grouped posts API
            const sortSelect = document.getElementById('gallery-sort');
            const sortVal = sortSelect ? sortSelect.value : 'newest';
            let url = `/api/posts?page=${galleryPage}&limit=${galleryLimit}&type=${galleryActiveTab}&sort=${encodeURIComponent(sortVal)}`;
            if (selectedAccount !== '') {
                url += `&username=${encodeURIComponent(selectedAccount)}`;
            } else if (gallerySearchQuery) {
                url += `&search=${encodeURIComponent(gallerySearchQuery)}`;
            }

            const res = await fetch(url);
            const posts = await res.json();

            if (!append) {
                grid.innerHTML = '';
            }

            if (posts.length === 0) {
                galleryHasMore = false;
                if (sentinel) sentinel.style.display = 'none';

                if (!append) {
                    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px;" class="text-muted">
                        <h3>No archived posts found</h3>
                        <p style="margin-top: 8px; font-size: 0.9rem;">${selectedAccount ? 'Try switching tabs or adjusting search query.' : 'Your download vault is empty.'}</p>
                    </div>`;
                }
                galleryLoading = false;
                refreshIcons();
                return;
            }

            // If we fetched fewer posts than limit, there are no more posts to load
            if (posts.length < galleryLimit) {
                galleryHasMore = false;
                if (sentinel) sentinel.style.display = 'none';
            } else {
                galleryHasMore = true;
                if (sentinel) sentinel.style.display = 'flex';
            }

            posts.forEach(post => {
                if (!post.media || post.media.length === 0) return;

                const card = document.createElement('div');
                card.className = 'media-card';

                const firstMedia = post.media[0];
                const mediaUrl = getMediaUrl(firstMedia.localPath, post.username, firstMedia.filename);
                const isVideo = isVideoFile(firstMedia.filename);
                const fileExt = firstMedia.filename.split('.').pop().toUpperCase();

                // Deterministic likes and comments
                const hash = post.shortcode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const likes = (hash * 7) % 850 + 42;
                const comments = (hash * 3) % 85 + 5;

                const isCarousel = post.media.length > 1;

                card.innerHTML = `
                    <div class="media-preview-container">
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
                        ${isCarousel ? `
                            <div class="carousel-indicator" title="Carousel: ${post.media.length} items">
                                <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                            </div>
                        ` : ''}
                        <span class="media-badge" style="z-index: 10;">${isVideo ? 'Reel' : fileExt}</span>
                        ${isVideo ?
                        `<video src="${mediaUrl}" preload="metadata" muted></video>` :
                        `<img src="${mediaUrl}" alt="${firstMedia.filename}" loading="lazy">`
                    }
                    </div>
                    <div class="media-info">
                        <span class="media-user">@${post.username}</span>
                        <span class="media-filename" title="${firstMedia.filename}">${firstMedia.filename}</span>
                    </div>
                `;

                card.addEventListener('click', () => openLightbox(post));
                grid.appendChild(card);
            });

            refreshIcons();

        } catch (e) {
            if (!append) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">Failed to connect to local media. Make sure server is active.</div>';
            }
            console.error('Failed to load gallery', e);
        } finally {
            galleryLoading = false;
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
                const isVideo = isVideoFile(item.filename);

                // Re-encapsulate single download items as structured posts for Lightbox previewing
                const singlePost = {
                    shortcode: item.shortcode,
                    username: item.username,
                    downloadedAt: item.downloadedAt,
                    media: [
                        {
                            id: item.id,
                            filename: item.filename,
                            localPath: item.localPath,
                            fileSize: item.fileSize,
                            downloadedAt: item.downloadedAt
                        }
                    ]
                };

                tr.innerHTML = `
                    <td class="text-muted">${formatDate(item.downloadedAt)}</td>
                    <td><strong style="color: var(--accent);">@${item.username}</strong></td>
                    <td style="cursor: pointer; font-weight: 500;" class="preview-trigger">${item.filename} 👁️</td>
                    <td class="text-muted">${formatBytes(item.fileSize)}</td>
                    <td class="text-muted" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.localPath}">${item.localPath}</td>
                `;

                tr.querySelector('.preview-trigger').addEventListener('click', () => openLightbox(singlePost));
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

            // Reset skip handler
            document.querySelectorAll('.force-dl-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    const textSpan = button.querySelector('span');
                    textSpan.textContent = 'Clearing...';
                    button.disabled = true;

                    try {
                        const id = button.getAttribute('data-id');
                        const res = await fetch(`/api/skipped/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            textSpan.textContent = 'Reset!';
                            button.style.backgroundColor = 'var(--success)';
                            button.style.color = '#fff';
                            setTimeout(() => loadSkipped(), 1000);
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

    // Pagination Helper Controls (For Table Logs only)
    function setupPaginationButtons(type, count, currentPage) {
        const prevBtn = document.getElementById(`${type}-prev-btn`);
        const nextBtn = document.getElementById(`${type}-next-btn`);
        const pageInfo = document.getElementById(`${type}-page-info`);

        let limit = type === 'downloads' ? downloadsLimit : skippedLimit;

        if (pageInfo) pageInfo.textContent = `Page ${currentPage}`;
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = count < limit;
    }

    // Handle Pagination Clicks (For Table Logs only)
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
            loadGallery();
        }, 400); // 400ms debounce
    });

    // Gallery Sort Handler
    const sortSelect = document.getElementById('gallery-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            loadGallery();
        });
    }

    // Immersive Lightbox Modal Handler
    const lightbox = document.getElementById('lightbox');
    const lightboxMedia = document.getElementById('lightbox-media-container');
    const prevArrow = document.getElementById('lightbox-prev-btn');
    const nextArrow = document.getElementById('lightbox-next-btn');
    const dotsContainer = document.getElementById('lightbox-dots');

    // Sidebar DOM items
    const sbAvatar = document.getElementById('lightbox-avatar-char');
    const sbUsername = document.getElementById('lightbox-username');
    const sbFilename = document.getElementById('lightbox-filename');
    const sbIndex = document.getElementById('lightbox-index');
    const sbSize = document.getElementById('lightbox-size');
    const sbPath = document.getElementById('lightbox-local-path');
    const sbDate = document.getElementById('lightbox-date');

    const copyPathBtn = document.getElementById('lightbox-copy-path-btn');
    const openFileBtn = document.getElementById('lightbox-open-file-btn');

    function openLightbox(post) {
        currentPost = post;
        currentMediaIndex = 0;

        renderLightboxMedia(0);
        lightbox.classList.add('active');
        refreshIcons();
    }

    function renderLightboxMedia(index) {
        if (!currentPost || !currentPost.media || currentPost.media.length === 0) return;

        const mediaItem = currentPost.media[index];
        const mediaUrl = getMediaUrl(mediaItem.localPath, currentPost.username, mediaItem.filename);
        const isVid = isVideoFile(mediaItem.filename);

        lightboxMedia.innerHTML = '';

        if (isVid) {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.autoplay = true;
            video.style.outline = 'none';
            lightboxMedia.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = mediaItem.filename;
            lightboxMedia.appendChild(img);
        }

        // Populate metadata panels
        sbAvatar.textContent = currentPost.username.substring(0, 1).toUpperCase();
        sbUsername.textContent = currentPost.username;
        sbFilename.textContent = mediaItem.filename;
        sbIndex.textContent = `${index + 1} of ${currentPost.media.length}`;
        sbSize.textContent = formatBytes(mediaItem.fileSize || 0);
        sbPath.textContent = mediaItem.localPath;
        sbPath.title = "Click to copy: " + mediaItem.localPath;
        sbDate.textContent = formatDate(mediaItem.downloadedAt);

        // Sidebar interactions
        copyPathBtn.onclick = () => {
            navigator.clipboard.writeText(mediaItem.localPath);
            const originalText = copyPathBtn.querySelector('span').textContent;
            copyPathBtn.querySelector('span').textContent = "Path Copied!";
            copyPathBtn.style.background = "var(--success)";
            copyPathBtn.style.color = "#fff";
            setTimeout(() => {
                copyPathBtn.querySelector('span').textContent = originalText;
                copyPathBtn.style.background = "";
                copyPathBtn.style.color = "";
            }, 1200);
        };

        openFileBtn.onclick = () => {
            window.open(mediaUrl, '_blank');
        };

        // Render dot indices
        dotsContainer.innerHTML = '';
        if (currentPost.media.length > 1) {
            for (let i = 0; i < currentPost.media.length; i++) {
                const dot = document.createElement('span');
                dot.className = `lightbox-dot ${i === index ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    currentMediaIndex = i;
                    renderLightboxMedia(i);
                });
                dotsContainer.appendChild(dot);
            }
            prevArrow.style.display = 'flex';
            nextArrow.style.display = 'flex';
        } else {
            prevArrow.style.display = 'none';
            nextArrow.style.display = 'none';
        }
    }

    prevArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentPost || currentPost.media.length <= 1) return;
        currentMediaIndex = (currentMediaIndex - 1 + currentPost.media.length) % currentPost.media.length;
        renderLightboxMedia(currentMediaIndex);
    });

    nextArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentPost || currentPost.media.length <= 1) return;
        currentMediaIndex = (currentMediaIndex + 1) % currentPost.media.length;
        renderLightboxMedia(currentMediaIndex);
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        const video = lightboxMedia.querySelector('video');
        if (video) {
            video.pause();
            video.src = '';
        }
        lightboxMedia.innerHTML = '';
        currentPost = null;
    }

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.closest('.lightbox-close')) {
            closeLightbox();
        }
    });

    // Keyboard navigation controls
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active') || !currentPost) return;

        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowRight' && currentPost.media.length > 1) {
            currentMediaIndex = (currentMediaIndex + 1) % currentPost.media.length;
            renderLightboxMedia(currentMediaIndex);
        } else if (e.key === 'ArrowLeft' && currentPost.media.length > 1) {
            currentMediaIndex = (currentMediaIndex - 1 + currentPost.media.length) % currentPost.media.length;
            renderLightboxMedia(currentMediaIndex);
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

    // Live Streaming Logs Panel Setup
    let sseSource = null;

    function initLiveLogs() {
        const terminalBody = document.getElementById('terminal-body');
        if (!terminalBody) return;

        if (sseSource) {
            sseSource.close();
        }

        terminalBody.innerHTML = '<div style="color: #64748b;">Connecting to instavault system log stream...</div>';

        sseSource = new EventSource('/api/logs/stream');

        sseSource.onopen = () => {
            terminalBody.innerHTML = '<div style="color: #10b981; font-weight: bold;">[CONNECTED] Real-time logs system active.</div>';
        };

        sseSource.onmessage = (event) => {
            if (!event.data) return;
            appendLogLine(event.data);
        };

        sseSource.onerror = (err) => {
            console.error("SSE stream error", err);
            const errDiv = document.createElement('div');
            errDiv.style.color = '#ef4444';
            errDiv.innerHTML = `[ERROR] Connection lost. Attempting to reconnect...`;
            terminalBody.appendChild(errDiv);
        };
    }

    function appendLogLine(line) {
        const term = document.getElementById('terminal-body');
        if (!term) return;

        const div = document.createElement('div');
        div.className = 'terminal-line';

        // Escape HTML to prevent injection
        const escaped = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Colorize tags nicely
        if (escaped.includes('[DL]')) {
            const parts = escaped.split('[DL]');
            div.innerHTML = `<span class="log-tag dl">[DL]</span>${parts[1]}`;
        } else if (escaped.includes('[SKIP]')) {
            const parts = escaped.split('[SKIP]');
            div.innerHTML = `<span class="log-tag skip">[SKIP]</span>${parts[1]}`;
        } else if (escaped.includes('[ERR]')) {
            const parts = escaped.split('[ERR]');
            div.innerHTML = `<span class="log-tag err">[ERR]</span>${parts[1]}`;
        } else if (escaped.includes('[FORCE]')) {
            const parts = escaped.split('[FORCE]');
            div.innerHTML = `<span class="log-tag force">[FORCE]</span>${parts[1]}`;
        } else {
            div.textContent = line;
        }

        term.appendChild(div);

        // Auto-scroll if active
        const autoscrollBtn = document.getElementById('terminal-autoscroll');
        if (autoscrollBtn && autoscrollBtn.classList.contains('active')) {
            term.scrollTop = term.scrollHeight;
        }
    }

    // Terminal controls
    const clearTermBtn = document.getElementById('terminal-clear');
    if (clearTermBtn) {
        clearTermBtn.addEventListener('click', () => {
            const term = document.getElementById('terminal-body');
            if (term) {
                term.innerHTML = '<div style="color: #64748b;">Console cleared. Listening for new system logs...</div>';
            }
        });
    }

    const copyTermBtn = document.getElementById('terminal-copy');
    if (copyTermBtn) {
        copyTermBtn.addEventListener('click', () => {
            const term = document.getElementById('terminal-body');
            if (!term) return;

            navigator.clipboard.writeText(term.innerText);

            const originalColor = copyTermBtn.style.color;
            copyTermBtn.style.color = 'var(--success)';
            setTimeout(() => {
                copyTermBtn.style.color = originalColor;
            }, 1000);
        });
    }

    const scrollTermBtn = document.getElementById('terminal-autoscroll');
    if (scrollTermBtn) {
        scrollTermBtn.addEventListener('click', () => {
            scrollTermBtn.classList.toggle('active');
        });
    }

    // Setup Pre-fetching Infinite Scroll Observer for Gallery
    function initInfiniteScroll() {
        const sentinel = document.getElementById('gallery-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !galleryLoading && galleryHasMore) {
                galleryPage++;
                loadGallery(true);
            }
        }, {
            root: null,
            rootMargin: '150px', // Pre-fetch 150px before sentinel hits viewport
            threshold: 0.1
        });

        observer.observe(sentinel);
    }

    // Purge Profile Vault Event Handler
    const purgeProfileBtn = document.getElementById('profile-purge-btn');
    if (purgeProfileBtn) {
        purgeProfileBtn.addEventListener('click', async () => {
            if (!selectedAccount) return;

            const confirmPurge = confirm(`⚠️ WARNING: Are you sure you want to permanently delete profile @${selectedAccount} and all of its local media archive files? This database logs and physical directory will be completely purged from local storage! This action CANNOT be undone.`);
            if (!confirmPurge) return;

            const originalHTML = purgeProfileBtn.innerHTML;
            purgeProfileBtn.disabled = true;
            purgeProfileBtn.innerHTML = '<i class="status-spinner" data-lucide="loader-2"></i><span>Purging...</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            try {
                const res = await fetch(`/api/accounts/${selectedAccount}`, {
                    method: 'DELETE'
                });
                
                const result = await res.json();
                
                if (res.ok && result.status !== 'error') {
                    purgeProfileBtn.innerHTML = '<i data-lucide="check"></i><span>Purged!</span>';
                    if (typeof lucide !== 'undefined') lucide.createIcons();

                    setTimeout(() => {
                        // Reset selection back to "All Media"
                        selectedAccount = "";
                        
                        // Re-fetch stories, gallery grid, and dashboard analytics
                        loadGallery();
                        loadStats();
                    }, 1200);
                } else {
                    throw new Error(result.message || 'Server failed to purge target profile.');
                }
            } catch (err) {
                console.error(err);
                alert(`Error: ${err.message || 'Connection failure. Make sure server is online.'}`);
                purgeProfileBtn.disabled = false;
                purgeProfileBtn.innerHTML = originalHTML;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // Initialize application settings & load default states
    initApp();

    // Auto-refresh Dashboard Stats every 15 seconds if active
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadStats();
        }
    }, 15000);
});

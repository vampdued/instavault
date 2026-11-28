(() => {
  const PAUSE_ICON_PATH =
    "M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z";
  const MEDIA_EXT_IMAGE = "jpg";
  const MEDIA_EXT_VIDEO = "mp4";
  const MEDIA_TYPE_IMAGE = 1;
  const MEDIA_TYPE_VIDEO = 2;
  const MEDIA_TYPE_CAROUSEL = 8;
  const FILTER_OK = "ok";
  const FILTER_STOP = "stop";
  const FILTER_SKIP = "skip";

  function getCurrentRoute() {
    if (
      window.InstaVaultRoutes &&
      typeof window.InstaVaultRoutes.classifyInstagramRoute === "function"
    ) {
      return window.InstaVaultRoutes.classifyInstagramRoute(location.href);
    }
    if (typeof window.classifyInstagramRoute === "function") {
      return window.classifyInstagramRoute(location.href);
    }
    return {
      type: "unknown",
      username: null,
      shortcode: null,
      highlightId: null,
      mediaId: null,
      audioId: null,
      locationId: null,
      collectionId: null,
      isReserved: false,
      pathname: location.pathname,
      segments: [],
    };
  }

  function getCurrentCapabilities(route = getCurrentRoute()) {
    if (
      window.InstaVaultRoutes &&
      typeof window.InstaVaultRoutes.getRouteCapabilities === "function"
    ) {
      return window.InstaVaultRoutes.getRouteCapabilities(route);
    }
    return { type: (route && route.type) || "unknown" };
  }

  function shortcodeToPk(shortcode) {
    if (
      window.InstaVaultRoutes &&
      typeof window.InstaVaultRoutes.shortcodeToPk === "function"
    ) {
      return window.InstaVaultRoutes.shortcodeToPk(shortcode);
    }
    return null;
  }

  function getRouteUsername(route = getCurrentRoute()) {
    return route.username || (route.segments && route.segments[0]) || null;
  }

  function getCollectionId(route = getCurrentRoute()) {
    if (route.collectionId) return route.collectionId;
    const segs = route.segments || [];
    return segs.length ? segs[segs.length - 1] : null;
  }

  function getSearchQuery() {
    return new URLSearchParams(location.search).get("q");
  }

  function getReelShortcode(route = getCurrentRoute()) {
    return route.type === "reel" || route.type === "reels_feed"
      ? route.shortcode
      : null;
  }

  function compareByTakenAtDesc(a, b) {
    return a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0;
  }

  function compareByResolutionDesc(a, b) {
    let aw = a.width || a.config_width || null,
      bw = b.width || b.config_width || null,
      ah = a.height || a.config_height || null,
      bh = b.height || b.config_height || null;
    return aw && bw && aw !== ah && bw !== bh
      ? aw !== bw
        ? bw > aw
          ? 1
          : -1
        : bh > ah
          ? 1
          : -1
      : 0;
  }

  function randomFallbackId() {
    return Math.floor(Math.random() * 9e9) + 1;
  }

  function isProfileHeaderPresent(username) {
    if (
      document.querySelector(
        `a[href*="${username}/followers/"], a[href*="${username}/following/"]`,
      )
    ) {
      return true;
    }
    let header = document.querySelector("main header section");
    return Boolean(
      header && header.innerText && header.innerText.toLowerCase().includes(username),
    );
  }

  function waitForProfileReady(username, cb) {
    if (!username) return cb(false);
    let intervalId = null;
    let timeoutId = null;
    function cleanup() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
    function check() {
      if (username && isProfileHeaderPresent(username)) {
        cleanup();
        cb(username !== "explore");
        return true;
      }
      return false;
    }
    if (!check()) {
      cleanup();
      intervalId = setInterval(check, 10);
      timeoutId = setTimeout(function () {
        cleanup();
        cb(false);
      }, 1e4);
    }
  }

  function waitForReelsFeedReady(cb) {
    let timeoutId = null;
    let intervalId = setInterval(function () {
      const route = getCurrentRoute();
      if ((route.type === "reels_feed" && route.shortcode) || document.querySelector("video")) {
        clearInterval(intervalId);
        intervalId = null;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        cb(true);
      }
    }, 50);
    timeoutId = setTimeout(function () {
      clearInterval(intervalId);
      intervalId = null;
      cb(false);
    }, 5e3);
  }

  function resolvePageRoute(cb) {
    const route = getCurrentRoute();
    if (route.type === "reels_feed") {
      return waitForReelsFeedReady(function (ready) {
        cb(ready ? route : null);
      });
    }
    if (route.type === "profile") {
      return waitForProfileReady(getRouteUsername(route), function (ready) {
        cb(ready ? route : null);
      });
    }
    if (route.type === "reserved" || route.type === "unknown") {
      return cb(null);
    }
    return cb(route);
  }

  function getDownloadStatus() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ title: "get_download_status" }, function (res) {
        resolve(res);
      });
    });
  }

  function getSavedInputDate() {
    return new Promise(function (resolve) {
      let d = new Date();
      d.setMonth(d.getMonth() - 1);
      let fallback = d.getTime() / 1e3;
      const route = getCurrentRoute();
      const caps = getCurrentCapabilities(route);
      chrome.storage.local.get("inputDate", function (data) {
        if (!data || !data.inputDate || !caps.isUserRoute) return resolve(fallback);
        let username = getRouteUsername(route);
        if (username && isProfileHeaderPresent(username)) {
          let key = username + "_" + route.type;
          return resolve(data.inputDate[key] || fallback);
        }
        return resolve(fallback);
      });
    });
  }

  function isDarkTheme() {
    if (
      document.documentElement.classList.contains("dark") ||
      (document.body && document.body.classList.contains("dark"))
    )
      return true;
    if (document.documentElement.getAttribute("data-theme") === "dark") return true;
    if (
      document.body &&
      (document.body.classList.contains("_a83e") ||
        document.documentElement.classList.contains("_a83e"))
    )
      return true;
    let stored = localStorage.getItem("igt");
    if (stored === "dark") return true;
    try {
      let el = document.body || document.documentElement;
      if (el) {
        let bg = window.getComputedStyle(el).backgroundColor;
        let m = bg.match(/\d+/g);
        if (m && m.length >= 3) {
          let lum = 0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2];
          if (lum < 128) return true;
        }
      }
    } catch (_) {}
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return true;
    return false;
  }

  function pauseActiveMedia() {
    let pathEl = document.querySelector(`svg path[d*="${PAUSE_ICON_PATH}"]`) || null;
    if (!pathEl) return;
    let btn = pathEl.closest("button") || null;
    btn ? btn.click() : pathEl.parentElement.parentElement.click();
  }

  function normalizeMediaItem(raw, meta) {
    return {
      username: meta._userName,
      id: raw.id || raw.pk || randomFallbackId(),
      url: meta.url,
      fileExt: meta.fileExt,
      takenAt: meta.takenAt,
      collectionName: meta._collectionName || meta.collectionName || null,
      shortcode: meta.shortcode || meta.code || meta.id || meta.pk || null,
      y: meta.creationTime.getFullYear().toString(),
      m: (meta.creationTime.getMonth() + 1).toString().padStart(2, "0"),
      d: meta.creationTime.getDate().toString().padStart(2, "0"),
      time: meta.creationTime.toTimeString().slice(0, 8).replace(/:/g, ""),
      tm: new Date().getTime().toString(),
      dm: meta.creationTime.toISOString().split("T")[0],
      q: `${meta.width}x${meta.height}`,
      desc: (raw.caption && raw.caption.text) || "",
      lc: raw.like_count || null,
      pc: raw.play_count || null,
      cc: raw.comment_count || null,
      pt: meta.pageType,
      loc:
        (raw.location && raw.location.name) ||
        (raw.location && raw.location.short_name) ||
        (raw.location && raw.location.city) ||
        "",
      index: meta.index || null,
      prefix: chrome.i18n.getMessage("massPrefix"),
      isThumb: meta.isThumb || false,
    };
  }

      function a(t) {
        if (
          ((O.downloadingFlag = !1),
          (c.isLoaderActive = !1),
          c.$t(),
          (() => { const caps = getCurrentCapabilities(); return !caps.type || caps.type === "unknown" || caps.isStoryOrHighlight; })())
        ) {
          let t = document.querySelector('svg[aria-label="Play"]');
          if (t) return t.parentElement.click();
        }
      }
      function u(t) {
        if (
          ((O.downloadingFlag = !1),
          c.$t(),
          getCurrentCapabilities().isStoryOrHighlight)
        ) {
          let t = document.querySelector('svg[aria-label="Play"]');
          if (t) return t.parentElement.click();
        }
      }
      class c {
        static isCancelState = !1;
        static isLoaderActive = !1;
        static autoDismissTimeout = null;
        static $t() {
          if (c.autoDismissTimeout) {
            clearTimeout(c.autoDismissTimeout);
            c.autoDismissTimeout = null;
          }
          ((O.downloadingFlag = !1), (c.isLoaderActive = !1), (c.isCancelState = !0));
          let t = document.querySelector(".mdfi-dialog-base"),
            e = document.querySelector(".mdfi-interceptor-loader-base");
          (t && t.remove(), e && e.remove());
        }
        static xt(t) {
          let dialog = document.querySelector(".mdfi-dialog-base");
          if (!dialog) return;
          let existingLoader = dialog.querySelector(".mdfi-dialog-loader-base");
          if (existingLoader) existingLoader.remove();
          let loader = document.createElement("div");
          loader.className = "mdfi-dialog-loader-base";
          loader.innerHTML = `
            <div class="mdfi-dialog-status-row">
              <span class="mdfi-dialog-message-base">${t}</span>
            </div>
            <div class="mdfi-dialog-footer" style="justify-content: flex-end; margin-top: 14px;">
              <button class="mdfi-dialog-cancel-base">${chrome.i18n.getMessage("dialogClose")}</button>
            </div>
          `;
          dialog.appendChild(loader);
          let i = loader.querySelector(".mdfi-dialog-cancel-base");
          i && i.addEventListener("click", a);
        }
        static Et(t) {
          ((O.downloadingFlag = !1), c.$t(), c.Tt(), c.xt(t));
        }
        static Pt(t) {
          if (!c.isLoaderActive) {
            if (window.InstaVaultClient) window.InstaVaultClient.notifySyncStart("", "preparing");
            c.Tt();
            let loader = document.createElement("div");
            loader.className = "mdfi-dialog-loader-base";
            loader.innerHTML = `
              <div class="mdfi-dialog-status-row">
                <span class="mdfi-dialog-status-text">${chrome.i18n.getMessage("dialogArchiving") || "Saving media to InstaVault…"}</span>
              </div>
              <div class="mdfi-dialog-progress-full-base">
                <div class="mdfi-dialog-progress-base"></div>
              </div>
              <div class="mdfi-dialog-footer">
                <span class="mdfi-dialog-subtext">${chrome.i18n.getMessage("dialogSubtext") || "Saved locally on your device"}</span>
                <button class="mdfi-dialog-cancel-base">${chrome.i18n.getMessage("dialogCancel")}</button>
              </div>
            `;
            let dialog = document.querySelector(".mdfi-dialog-base");
            if (dialog) dialog.appendChild(loader);
            let btn = document.querySelector(".mdfi-dialog-cancel-base");
            if (btn) btn.addEventListener("click", u);
          }
          let pct = Math.min(100, Math.max(0, parseInt(t) || 0));
          let percEl = document.querySelector(".mdfi-dialog-progress-percantage-base");
          let barEl = document.querySelector(".mdfi-dialog-progress-base");
          let statusEl = document.querySelector(".mdfi-dialog-status-text");
          let cancelBtn = document.querySelector(".mdfi-dialog-cancel-base");
          let dialogEl = document.querySelector(".mdfi-dialog-base");

          if (barEl) {
            barEl.style.width = pct + "%";
          }
          if (percEl) {
            percEl.textContent = pct + "%";
          }
          if (pct >= 100) {
            if (dialogEl) dialogEl.classList.add("mdfi-dialog-complete");
            if (statusEl) {
              statusEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>${chrome.i18n.getMessage("downloadDoneSuccess")}</span>
              `;
            }
            if (cancelBtn) {
              cancelBtn.textContent = chrome.i18n.getMessage("dialogClose");
              cancelBtn.classList.add("mdfi-btn-complete");
              cancelBtn.removeEventListener("click", u);
              cancelBtn.addEventListener("click", a);
            }
            if (!c.autoDismissTimeout) {
              c.autoDismissTimeout = setTimeout(function () {
                if (dialogEl) {
                  dialogEl.style.opacity = "0";
                  dialogEl.style.transform = "translate(-50%, -46%) scale(0.96)";
                  let backdrop = document.querySelector(".mdfi-interceptor-loader-base");
                  if (backdrop) backdrop.style.opacity = "0";
                }
                setTimeout(a, 250);
              }, 1800);
            }
          }
        }
        static Tt() {
          c.isLoaderActive = !0;
          if (c.autoDismissTimeout) {
            clearTimeout(c.autoDismissTimeout);
            c.autoDismissTimeout = null;
          }
          E.Ke();
          let t = document.createElement("div");
          t.className = "mdfi-interceptor-loader-base";
          document.body.appendChild(t);
          let e = document.createElement("div");
          e.className = "mdfi-dialog-base";
          e.innerHTML = `
            <div class="mdfi-dialog-header">
              <div class="mdfi-dialog-brand">
                <div class="mdfi-dialog-logo-base"></div>
                <span class="mdfi-dialog-title-base">${chrome.i18n.getMessage("dialogTitle")}</span>
              </div>
              <span class="mdfi-dialog-progress-percantage-base">0%</span>
            </div>
          `;
          document.body.appendChild(e);
        }
      }
      class l {
        static async At(t = null) {
          if ((t || (t = getRouteUsername()), !t)) return null;
          if (!window.InstaVaultStoryEngine) return null;
          return window.InstaVaultStoryEngine.getUserId(t);
        }
        static St(t, e = !1) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_user_info", userName: t, rawData: e },
              function (t) {
                if (!t || (t && t.err)) return i(null);
                i(t);
              },
            );
          });
        }
      }
      const f = {
        Nt: "_",
        Dt: {
          isDwThumb: !1,
          fileNamePattern: "<username>/<id>",
        },
        Ut: null,
        Ct() {
          let t = this;
          return new Promise(function (e) {
            chrome.storage.local.get("settings", function (i) {
              let n = (i && i.settings) || null;
              return (n || (n = t.Dt), e(n));
            });
          });
        },
        Bt() {
          let t = this;
          return new Promise(function (e) {
            t.Ct().then(function (i) {
              return ((t.Ut = (i && i.isDwThumb) || !1), e(t.Ut));
            });
          });
        },
        Rt(t) {
          chrome.storage.local.set({ settings: t });
        },
        zt() {
          let t = this;
          chrome.storage.local.get("settings", function (e) {
            let i = (e && e.settings) || null;
            (i || (i = t.Dt), chrome.storage.local.set({ settings: i }));
          });
        },
      };
      class d {
        static Ft(t) {
          let e = t.media || t,
            i = [],
            n = null,
            r = null;
          const route = getCurrentRoute();
          const caps = getCurrentCapabilities(route);
          (caps.isUserRoute && (n = R.Ot()),
            caps.isSavedCollection && (r = R.Lt()));
          let s = e.taken_at || e.taken_at_timestamp || null,
            a = s && new Date(1e3 * parseInt(s));
          if (e.media_type === MEDIA_TYPE_IMAGE) {
            if (
              !e.image_versions2 &&
              !e.image_versions2.candidates &&
              !e.image_versions2.candidates.length
            )
              return null;
            let t = e.image_versions2.candidates.sort(compareByResolutionDesc);
            n || (n = (e.user && e.user.username) || randomFallbackId());
            let u = normalizeMediaItem(e, {
              _userName: n,
              url: t[0].src || t[0].url,
              width: t[0].width,
              height: t[0].height,
              takenAt: s,
              fileExt: MEDIA_EXT_IMAGE,
              collectionName: r,
              pageType: route.type,
              creationTime: a,
            });
            i.push(u);
          } else if (e.media_type === MEDIA_TYPE_VIDEO) {
            if (!e.video_versions && !e.video_versions.length) return null;
            let t = e.video_versions.sort(compareByResolutionDesc);
            n || (n = (e.user && e.user.username) || randomFallbackId());
            let u = normalizeMediaItem(e, {
              _userName: n,
              url: t[0].src || t[0].url,
              width: t[0].width,
              height: t[0].height,
              fileExt: MEDIA_EXT_VIDEO,
              takenAt: s,
              collectionName: r,
              pageType: route.type,
              creationTime: a,
            });
            if ((i.push(u), f.Ut)) {
              let t = e.image_versions2.candidates.sort(compareByResolutionDesc),
                u = normalizeMediaItem(e, {
                  _userName: n,
                  url: t[0].src || t[0].url,
                  width: t[0].width,
                  height: t[0].height,
                  takenAt: s,
                  fileExt: MEDIA_EXT_IMAGE,
                  collectionName: r,
                  pageType: route.type,
                  creationTime: a,
                });
              i.push(u);
            }
          } else if (e.media_type === MEDIA_TYPE_CAROUSEL) {
            if (!e.carousel_media || !e.carousel_media.length) return null;
            n || (n = (e.user && e.user.username) || randomFallbackId());
            let t = 0;
            for (let u of e.carousel_media) {
              if (
                (t++,
                !u.image_versions2 &&
                  !u.image_versions2.candidates &&
                  !u.image_versions2.candidates.length)
              )
                continue;
              let c, l;
              if (u.media_type === MEDIA_TYPE_VIDEO) {
                if (((c = u.video_versions.sort(compareByResolutionDesc)), (l = MEDIA_EXT_VIDEO), f.Ut)) {
                  let e = u.image_versions2.candidates.sort(compareByResolutionDesc),
                    c = normalizeMediaItem(u, {
                      _userName: n,
                      url: e[0].src || e[0].url,
                      width: e[0].width,
                      height: e[0].height,
                      takenAt: s,
                      fileExt: MEDIA_EXT_IMAGE,
                      collectionName: r,
                      pageType: route.type,
                      creationTime: a,
                      index: t,
                      isThumb: !0,
                    });
                  i.push(c);
                }
              } else
                ((c = u.image_versions2.candidates.sort(compareByResolutionDesc)), (l = MEDIA_EXT_IMAGE));
              let d = normalizeMediaItem(e, {
                _userName: n,
                url: c[0].src || c[0].url,
                width: c[0].width,
                height: c[0].height,
                takenAt: s,
                fileExt: l,
                collectionName: r,
                pageType: route.type,
                creationTime: a,
                index: t,
              });
              i.push(d);
            }
          }
          return i;
        }
        static async Wt(t) {
          if (!t.node || !t.node.id) return null;
          let e = await B.jt(t.node.id).catch(function (t) {
            c.Et(chrome.i18n.getMessage("mediaInfoByIdErr"));
          });
          if (!e && !Array.isArray(e) && !e.length) return null;
          let i = d.Ft(e[0]);
          return i && i.length ? i : null;
        }
        static Zt(t) {
          let e = [],
            i = null;
          const route = getCurrentRoute();
          const caps = getCurrentCapabilities(route);
          let n = null;
          (caps.isUserRoute && (i = R.Ot()),
            caps.isSavedCollection && (n = R.Lt()),
            i || (i = (t.owner && t.owner.username) || randomFallbackId()));
          let r = t.taken_at || t.taken_at_timestamp || null,
            s = r && new Date(1e3 * parseInt(r)),
            a = 0;
          if (t.edge_sidecar_to_children && t.edge_sidecar_to_children.edges)
            t.edge_sidecar_to_children.edges.forEach(function (u) {
              if ((a++, u.node && u.node.display_resources)) {
                let c = u.node.display_resources.sort(compareByResolutionDesc),
                  l = normalizeMediaItem(t, {
                    _userName: i,
                    url: c[0].src || c[0].url,
                    width: c[0].width,
                    height: c[0].height,
                    pageType: route.type,
                    fileExt: MEDIA_EXT_IMAGE,
                    collectionName: n,
                    index: a,
                    takenAt: r,
                    creationTime: s,
                  });
                e.push(l);
              }
            });
          else if (t.display_resources && !1 === t.is_video) {
            let a = t.display_resources.sort(compareByResolutionDesc),
              u = normalizeMediaItem(itemMedia, {
                _userName: i,
                url: a[0].src || a[0].url,
                width: a[0].width,
                height: a[0].height,
                pageType: route.type,
                fileExt: MEDIA_EXT_IMAGE,
                collectionName: n,
                takenAt: r,
                creationTime: s,
              });
            e.push(u);
          } else {
            if (!0 !== t.is_video || !t.video_url) return null;
            {
              let a = normalizeMediaItem(itemMedia, {
                _userName: i,
                url: t.video_url,
                width: t.width,
                height: t.height,
                takenAt: r,
                fileExt: MEDIA_EXT_VIDEO,
                creationTime: s,
                collectionName: n,
                pageType: route.type,
              });
              if ((e.push(a), f.Ut)) {
                let a = t.image_versions2.candidates.sort(compareByResolutionDesc),
                  u = normalizeMediaItem(t, {
                    _userName: i,
                    url: a[0].src || a[0].url,
                    width: a[0].width,
                    height: a[0].height,
                    fileExt: MEDIA_EXT_IMAGE,
                    takenAt: r,
                    collectionName: n,
                    pageType: route.type,
                    creationTime: s,
                    isThumb: !0,
                  });
                e.push(u);
              }
            }
          }
          return e.length ? e : null;
        }
        static async Gt(t) {
          if (!t.node) return d.Ft(t);
          let e = d.Zt(t.node);
          return e ||
            !t.node.shortcode ||
            ((e = await B.Ht(t.node.shortcode)), e || e.length)
            ? e
            : null;
        }
      }
      class h {
        static qt(t, e) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_explorer_basic_by_type", searchId: e, type: t },
              function (t) {
                if (!t || (t && t.err)) return n();
                i(t);
              },
            );
          });
        }
        static Jt(t, e, i, n) {
          return new Promise(function (r, s) {
            chrome.runtime.sendMessage(
              {
                title: "get_explorer_scroll_by_type",
                searchId: e,
                pageNum: n,
                maxId: i,
                type: t,
              },
              function (t) {
                if (!t || (t && t.err)) return s();
                r(t);
              },
            );
          });
        }
      }
      class m {
        static audioId = null;
        static info = null;
        static Vt() {
          return (
            getCurrentCapabilities().isReelsAudio ||
            ((m.audioId = null), (m.info = null), !1)
          );
        }
        static async Tt() {
          const audioId = getCurrentRoute().audioId;
          m.Vt() &&
            ((m.info && m.audioId && m.audioId === audioId) ||
              ((m.audioId = audioId), (m.info = await B.Xt(m.audioId))));
        }
        static async Yt(t) {
          if (!m.Vt()) return null;
          m.info || (await m.Tt());
          let e = [];
          if (m.info && m.info.feedInfo && m.info.feedInfo.length)
            for (let i of m.info.feedInfo) {
              let n = d.Ft(i),
                r,
                s = t(n[0] || n);
              if (s === FILTER_OK) e = e.concat(n);
              else if (s === FILTER_STOP) break;
            }
          return e;
        }
        static Qt() {
          return (m.Vt() && m.info && m.info.feedCnt) || null;
        }
        static te() {
          return (m.Vt() && m.info && m.info.hasNextPage) || null;
        }
        static ee() {
          return (m.Vt() && m.info && m.info.maxId) || null;
        }
        static ie() {
          return (m.Vt() && m.info && m.audioId) || getCurrentRoute().audioId;
        }
      }
      async function v(t, e) {
        let i = null,
          n;
        const route = getCurrentRoute();
        switch (route.type) {
          case "reels_audio":
            {
              let t = e.audioId || m.ie();
              if (
                ((i = await B.Xt(t, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("audioReelsNoPostsErr"));
                })),
                !i || !i.feedInfo)
              )
                return c.Et(chrome.i18n.getMessage("audioReelsNoPostsErr"));
              n = d.Ft;
            }
            break;
          case "profile":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ne(t, e.userName, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userFeedNoPostsErr"));
                })),
                (n = d.Gt));
            }
            break;
          case "profile_saved_all":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.re(e.userId, e.maxId)),
                (n = d.Ft),
                i &&
                  i.err &&
                  ((i = await B.se(e.maxId).catch(function (t) {
                    return c.Et(chrome.i18n.getMessage("userSavedNoPostsErr"));
                  })),
                  (n = d.Ft)));
            }
            break;
          case "profile_saved_collection":
            {
              let t = getCollectionId(route);
              if (((i = await B.oe(t, e.maxId)), (n = d.Ft), !i || i.err))
                return c.Et(chrome.i18n.getMessage("userSavedNoPostsErr"));
            }
            break;
          case "profile_tagged":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ae(e.userId, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userTagNoPostsErr"));
                })),
                (n = d.Wt));
            }
            break;
          case "profile_reels":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ue(e.userId, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userReelsNoPostsErr"));
                })),
                (n = d.Ft));
            }
            break;
          case "explore_location":
          case "explore_tag":
            ((i = await h
              .Jt(e.type, e.searchId, e.maxId, e.pageNum)
              .catch(function (t) {
                c.Et(chrome.i18n.getMessage("explorerNoPostsErr"));
              })),
              (n = d.Ft));
            break;
        }
        if (!n || !i) return !1;
        let r = [];
        for (let e of i.feedInfo) {
          let i = t(e);
          if (i === FILTER_OK) {
            let t = await n(e);
            if (!t) continue;
            for (let e of t) r.push(e);
          } else if (i === FILTER_STOP) break;
        }
        return {
          maxId: i.maxId,
          hasNextPage: i.hasNextPage,
          postInfoToDownload: r,
        };
      }
      class p {
        static ce(t) {
          return new Promise((e, i) => {
            chrome.runtime.sendMessage(
              { title: "get_user_highlights_list", userId: t },
              function (t) {
                if (!t || (t && t.err)) return i();
                e(t);
              },
            );
          });
        }
        static async le(t) {
          if (!window.InstaVaultStoryEngine) throw new Error("Story engine unavailable");
          const items = await window.InstaVaultStoryEngine.fetchHighlight(t);
          if (!items || !items.length) throw new Error("Empty highlight");
          return items;
        }
        static async fe(t) {
          if (!window.InstaVaultStoryEngine) return null;
          const items = await window.InstaVaultStoryEngine.fetchUserStories(t);
          return items && items.length ? items : null;
        }
      }
      function _(t) {
        ((c.isCancelState = !1), pauseActiveMedia(), O.de(), c.Pt(0));
        let e = [];
        chrome.runtime.sendMessage(
          { title: "get_reels_tray_info" },
          async function (t) {
            if (c.isCancelState) return;
            if (!t || (t && t.err))
              return void c.Et(chrome.i18n.getMessage("userWithStoriesErr"));
            if (!t.tray || !t.tray.length)
              return void c.Et(chrome.i18n.getMessage("userWithStoriesErr"));
            if (c.isCancelState) return;
            c.Pt(5);
            let i = 0;
            for (let n of t.tray) {
              if (c.isCancelState) return;
              (i++, c.Pt(Math.round((i / t.tray.length) * 45) + 5));
              let r = null;
              r = n && n.id ? n.id : await l.At(n.user.username);
              let s = await p.fe(r);
              ((e = e.concat(s)), await new Promise((t) => setTimeout(t, 700)));
            }
            c.isCancelState ||
              (e && e.length
                ? c.isCancelState ||
                  O.he(e)
                    .then(function (t) {
                      t &&
                        t.notAllDw &&
                        c.Et(chrome.i18n.getMessage("notAllDwErr"));
                    })
                    .catch(function (t) {
                      c.Et(chrome.i18n.getMessage("dwErr"));
                    })
                : c.Et(chrome.i18n.getMessage("userWithStoriesErr")));
          },
        );
      }
      function w(t) {
        return new Promise(function (t, e) {
          if (
            (pauseActiveMedia(), (c.isCancelState = !1), O.de(), c.Pt(0), c.isCancelState)
          )
            return t();
          const route = getCurrentRoute();
          let i = route.type === "highlight" ? route.highlightId : null;
          return i
            ? c.isCancelState
              ? t()
              : (c.Pt(10),
                void p.le(i).then(function (e) {
                  if (c.isCancelState) return t();
                  (c.Pt(50),
                    O.he(e)
                      .then(function (t) {
                        t &&
                          t.notAllDw &&
                          c.Et(chrome.i18n.getMessage("notAllDwErr"));
                      })
                      .catch(function (t) {
                        c.Et(chrome.i18n.getMessage("dwErr"));
                      }));
                }))
            : (c.Et(chrome.i18n.getMessage("wrongPageType")), t());
        });
      }
      function b() {
        ((c.isCancelState = !1), O.de(), c.Pt(0), pauseActiveMedia());
        const route = getCurrentRoute();
        let t = route.type === "highlight" ? route.highlightId : null;
        t
          ? c.isCancelState ||
            (c.Pt(5),
            p.le(t).then(function (e) {
              if (c.isCancelState) return;
              if ((c.Pt(7), !e.length))
                return void c.Et(chrome.i18n.getMessage("smthWentWrong"));
              if (c.isCancelState) return;
              let i = e[0].userPk && e[0].userPk.toString();
              if (!i) return void c.Et(chrome.i18n.getMessage("noUserInfo"));
              if ((c.Pt(8), c.isCancelState)) return;
              let n = e;
              p.ce(i).then(async function (i) {
                if (c.isCancelState) return;
                c.Pt(9);
                let r = 0;
                for (let s of i) {
                  if (c.isCancelState) return;
                  if ((r++, c.Pt(Math.round((r / i.length) * 40) + 9), s !== t)) {
                    try {
                      ((e = await p.le(s)),
                        await new Promise((t) => setTimeout(t, 300)));
                    } catch (t) {
                      continue;
                    }
                    n = n.concat(e);
                  }
                }
                c.isCancelState ||
                  O.he(n)
                    .then(function (t) {
                      t &&
                        t.notAllDw &&
                        c.Et(chrome.i18n.getMessage("notAllDwErr"));
                    })
                    .catch(function (t) {
                      c.Et(chrome.i18n.getMessage("dwErr"));
                    });
              });
            }))
          : c.Et(chrome.i18n.getMessage("wrongPageType"));
      }
      function g(t) {
        return new Promise(function (t, e) {
          (pauseActiveMedia(), (c.isCancelState = !1), O.de(), c.Pt(0));
          const route = getCurrentRoute();
          let i = route.type === "story" ? route.username : null;
          if (!i) return (c.Et(chrome.i18n.getMessage("wrongPageType")), t());
          return c.isCancelState
            ? t()
            : i
              ? (c.Pt(15),
                c.isCancelState
                  ? t()
                  : void l.At(i).then(function (e) {
                      if (c.isCancelState) return t();
                      (c.Pt(25),
                        p.fe(e).then(function (e) {
                          return c.isCancelState
                            ? t()
                            : (c.Pt(50),
                              e && e.length
                                ? c.isCancelState
                                  ? t()
                                  : void O.he(e)
                                      .then(function (t) {
                                        t &&
                                          t.notAllDw &&
                                          c.Et(
                                            chrome.i18n.getMessage(
                                              "notAllDwErr",
                                            ),
                                          );
                                      })
                                      .catch(function (t) {
                                        c.Et(chrome.i18n.getMessage("dwErr"));
                                      })
                                : (c.Et(
                                    chrome.i18n.getMessage("smthWentWrong"),
                                  ),
                                  t()));
                        }));
                    }))
              : (c.Et(chrome.i18n.getMessage("wrongPageType")), t());
        });
      }
      const k = {
          me: -1,
          pe(t) {
            const e = window.getSelection();
            if (0 === e.rangeCount) return;
            const i = e.getRangeAt(0);
            if (!t.contains(i.startContainer)) return;
            for (
              ;
              "tag" ===
                i.commonAncestorContainer.parentNode.nodeName.toLowerCase() &&
              !(i.endOffset > t.innerHTML.length);
            ) {
              let e = i.startOffset;
              (i.setStart(t, e++), i.setEnd(t, e++));
            }
            const n = i.cloneRange();
            (n.selectNodeContents(t), n.setEnd(i.endContainer, i.endOffset));
            let r = n.toString().length;
            n.startContainer.textContent.trim().length ||
              ((n.startContainer.textContent = ""), (r = 0));
            this.me = r;
          },
          _e(t) {
            const e = document.createRange(),
              i = window.getSelection();
            if (t && t.childNodes.length > 0) {
              let i = t.lastChild;
              for (
                ;
                i &&
                i.nodeType === Node.ELEMENT_NODE &&
                "tag" === i.tagName.toLowerCase();
              )
                i = i.previousSibling;
              i && i.nodeType === Node.TEXT_NODE
                ? (e.setStart(i, i.textContent.length),
                  e.setEnd(i, i.textContent.length))
                : i
                  ? (e.setStartAfter(i), e.setEndAfter(i))
                  : (e.setStart(t, 0), e.setEnd(t, 0));
            } else (e.setStart(t, 0), e.setEnd(t, 0));
            (i.removeAllRanges(), i.addRange(e), t.focus(), this.pe(t));
          },
          we(t, e, i) {
            const n = window.getSelection(),
              r = document.createRange();
            if (0 === i && 0 === t.childNodes.length) t.appendChild(e);
            else if (i > 0) {
              let s = 0;
              const o = [t];
              for (; o.length > 0; ) {
                const t = o.pop();
                if (t.nodeType === Node.TEXT_NODE) {
                  const e = t.textContent.length;
                  if (s + e >= i) {
                    (r.setStart(t, i - s), r.setEnd(t, i - s));
                    break;
                  }
                  s += e;
                } else if (
                  t.nodeType === Node.ELEMENT_NODE &&
                  "tag" !== t.tagName.toLowerCase()
                )
                  for (let e = t.childNodes.length - 1; e >= 0; e--)
                    o.push(t.childNodes[e]);
                else s += t.textContent.length;
              }
              (n.removeAllRanges(),
                n.addRange(r),
                r.insertNode(e),
                r.setStartAfter(e),
                r.collapse(!0),
                n.removeAllRanges(),
                n.addRange(r));
            }
          },
          be(t) {
            let e = this;
            (t.addEventListener("keydown", (t) => e.pe.call(e, t.target)),
              t.addEventListener("keyup", (t) => e.pe.call(e, t.target)),
              t.addEventListener("beforeinput", (t) => e.pe.call(e, t.target)),
              t.addEventListener("click", (t) => e.pe.call(e, t.target)),
              t.addEventListener("focus", (t) => e.pe.call(e, t.target)));
          },
        },
        y = {
          ge(t) {
            x.ke();
          },
          ye(t) {
            let e = t.target.closest(".mdfi-settings-menu-base"),
              i = e.querySelector("input").checked || !1,
              n = e.querySelector(".file .input-view .wrap");
            const invalid =
              !n || n.childElementCount < 1
                ? (n && n.classList.add("warn"), (t.target.disabled = !0), !0)
                : (n.classList.remove("warn"), (t.target.disabled = !1), !1);
            invalid ||
              (f.Rt({
                isDwThumb: i,
                fileNamePattern: $.$e(n.innerHTML),
              }),
              x.ke());
          },
          xe(t) {
            let e,
              i = (
                "dw-thumb" === t.target.className
                  ? t.target
                  : t.target.closest(".dw-thumb")
              ).querySelector("input");
            if (!i) return;
            let n = i.checked || !1;
            i.checked = !n;
          },
          Ee(t) {
            let e = t.target,
              i = "</tag>&nbsp;",
              n = new RegExp(`${i}${t.data}$`);
            (n.test(e.innerHTML) &&
              (e.innerHTML = e.innerHTML.replace(n, `${i}${f.Nt}${t.data}`)),
              k._e(e),
              x.Te(e));
          },
          Pe(t) {
            let e = t.target;
            const i =
              (e.hasAttribute("template") && e.getAttribute("template")) ||
              null;
            let n =
              t.target
                .closest(".dropdown")
                .parentNode.querySelector(".input-view .wrap") || null;
            (x.Ie(e.textContent, i, e), x.Te(n));
          },
          Ae(t) {
            let e = document.querySelector(
              ".mdfi-settings-menu-base .mdfi-settings-control .save",
            );
            t.innerHTML.trim().length
              ? (t.classList.remove("warn"), (e.disabled = !1))
              : (t.classList.add("warn"), (e.disabled = !0));
          },
          Se(t) {
            let e = this;
            (t.addEventListener("keydown", e.Ne),
              t.addEventListener("beforeinput", e.Ne),
              t.addEventListener("keydown", (t) => e.Ae.call(e, t.target)),
              t.addEventListener("keyup", (t) => e.Ae.call(e, t.target)),
              t.addEventListener("beforeinput", (t) => e.Ae.call(e, t.target)),
              t.addEventListener("click", (t) => e.Ae.call(e, t.target)),
              t.addEventListener("focus", (t) => e.Ae.call(e, t.target)));
          },
          Ne(t) {
            x.Te(t.target);
            const e = void 0,
              i = window.getSelection().getRangeAt(0),
              n = i.startContainer.parentNode;
            ("tag" === n.tagName.toLowerCase() && t.preventDefault(),
              "tag" !== n.tagName.toLowerCase() ||
                "keydown" !== t.type ||
                (8 !== t.keyCode && 46 !== t.keyCode) ||
                n.remove());
            let r = i.startContainer;
            if (
              r &&
              r.nodeType === Node.ELEMENT_NODE &&
              (8 === t.keyCode || 46 === t.keyCode)
            ) {
              const e = void 0;
              "tag" === r.tagName.toLowerCase() &&
                (t.preventDefault(), r.remove());
            }
          },
          De(t) {
            f.Ct().then(function (t) {
              ((t.fileNamePattern = f.Dt.fileNamePattern), f.Rt(t), x.Ue(t));
            });
          },
        },
        $ = {
          Re: {
            username: "username",
            tm: "timestamp",
            dm: "datestamp",
            id: "file id",
            q: "quality",
            desc: "description",
            lc: "likes count",
            pc: "play count",
            cc: "comments count",
            loc: "location",
            prefix: "mass prefix",
            y: "year",
            m: "month",
            d: "day",
            time: "time",
          },
          ze(t, e) {
            let i = [];
            for (const [e, n] of Object.entries(t)) {
              let t = document.createElement("li");
              ((t.textContent = n.toString()),
                t.setAttribute("template", e),
                t.addEventListener("click", y.Pe),
                i.push(t));
            }
            return i;
          },
          Fe(t) {
            let e = this,
              i = t.replace(/&nbsp;/g, "");
            return (
              (i = i.replace(/<tag template="(.*?)">.*?<\/tag>/g, (t, i) =>
                e.Oe(i),
              )),
              i
            );
          },
          Le(t) {
            let e = this,
              i = t;
            return (
              (i = i.replace(
                /<(.*?)>/g,
                (t, i) => `<tag template="${i}">${e.Me(i)}</tag>`,
              )),
              `${i}&nbsp;`
            );
          },
          $e(t) {
            let e = t.replace(
              /<tag template="(.*?)">.*?<\/tag>/g,
              (t, e) => `<${e}>`,
            );
            return ((e = e.replace(/&nbsp;/g, "")), e);
          },
          Me(t) {
            return this.Re[t] || null;
          },
          Oe(t) {
            const e = new Date();
            switch (t) {
              case "y":
                return e.getFullYear().toString();
              case "m":
                return (e.getMonth() + 1).toString().padStart(2, "0");
              case "d":
                return e.getDate().toString().padStart(2, "0");
              case "time":
                return e.toTimeString().slice(0, 8).replace(/:/g, "");
              case "tm":
                return e.getTime().toString();
              case "dm":
                return e.toISOString().split("T")[0];
              case "q":
                return "4096x2160";
              case "desc":
                return "post description";
              case "lc":
                return Math.floor(1e3 * Math.random()).toString();
              case "pc":
                return Math.floor(1e4 * Math.random()).toString();
              case "cc":
                return Math.floor(500 * Math.random()).toString();
              case "pt":
                return getCurrentRoute().type;
              case "loc":
                return "New York";
              case "id":
                return "1234567890";
              case "username":
                return "john_doe";
              case "prefix":
                return "mass";
              default:
                return "";
            }
          },
          We(t) {
            const e = /<([^>]+)>|([^<]+)/g,
              i = [];
            let n;
            for (; null !== (n = e.exec(t)); )
              n[1]
                ? i.push({ type: "field", value: n[1] })
                : n[2] && i.push({ type: "static", value: n[2] });
            return i;
          },
        },
        x = {
          je() {
            let t = this;
            f.zt();
            let e = document.querySelector(".mdfi-settings-menu-base");
            (e && e.remove(),
              (e = document.createElement("div")),
              (e.className = "mdfi-settings-menu-base"),
              (e.innerHTML = t.Ze()));
            let i = document.querySelector(".mdfi-new-main-btn-div-base");
            (e.querySelector(".file .dropdown .list").append(...$.ze($.Re)),
              i.after(e),
              t.Ge(e),
              f.Ct().then(t.Ue.bind(t)));
          },
          ke() {
            let t = document.querySelector(".mdfi-settings-menu-base");
            t && t.remove();
          },
          Ue(t) {
            let e = document.querySelector(".mdfi-settings-menu-base"),
              i;
            e.querySelector("input").checked = t.isDwThumb;
            let n = e.querySelector(".file .input-view .wrap");
            ((n.innerHTML = $.Le(t.fileNamePattern)), this.Te(n));
          },
          Ge(t) {
            let e;
            t.querySelector(".dw-thumb").addEventListener("click", y.xe);
            let dashLink = t.querySelector(".mdfi-settings-dashboard-link");
            if (dashLink) {
              dashLink.addEventListener("click", function () {
                if (window.InstaVaultClient && window.InstaVaultClient.getDashboardUrl) {
                  window.InstaVaultClient.getDashboardUrl("#settings").then(function (url) {
                    window.open(url, "_blank", "noopener");
                  });
                }
              });
            }
            let closeBtn = t.querySelector(".iv-settings-close");
            closeBtn && closeBtn.addEventListener("click", y.ge);
            let i = t.querySelector(".mdfi-settings-control .cancel");
            i && i.addEventListener("click", y.ge);
            let n = t.querySelector(".mdfi-settings-control .save"),
              r,
              s,
              o,
              a;
            (n && n.addEventListener("click", y.ye),
              t
                .querySelector(".options .file")
                .querySelector(".wrap")
                .addEventListener("input", y.Ee));
            let u = t.querySelector(".file .input-view .wrap");
            (k.be(u),
              y.Se(u),
              t.querySelector(".file .restore").addEventListener("click", y.De));
          },
          Te(t) {
            let e = t.parentNode,
              i = t.innerHTML,
              n = e.parentNode.querySelector(".sample"),
              r = $.Fe(i);
            n.innerHTML = `${chrome.i18n.getMessage("settingsExample")} ${r}`;
          },
          Ie(t, e, i) {
            let n,
              r = i
                .closest(".dropdown")
                .parentNode.querySelector(".input-view .wrap"),
              s = this.He(t, e),
              o = k.me,
              a = 0;
            if (o && r.textContent[o - 1] !== f.Nt) {
              let t = document.createTextNode(f.Nt);
              (k.we(r, t, o), o++);
            }
            if (
              (k.we(r, s, o),
              (o += s.textContent.length),
              o === r.textContent.length)
            )
              r.innerHTML += "&nbsp;";
            else if (r.textContent[o] !== f.Nt) {
              let t = document.createTextNode(f.Nt);
              ((a += t.length), k.we(r, t, o), o++);
            }
            k._e(r);
          },
          He(t, e) {
            let i = document.createElement("tag");
            return ((i.textContent = t), i.setAttribute("template", e), i);
          },
          Ze: () =>
            `\n\t\t<div class="mdfi-settings-title">\n\t\t\t<span class="iv-settings-heading">${chrome.i18n.getMessage("settingsTitle")}</span>\n\t\t\t<button type="button" class="iv-settings-close" aria-label="Close settings" title="Close">×</button>\n\t\t</div>\n\t\t<div class="options">\n\t\t\t<div class="dw-thumb">\n\t\t\t\t<label class="mdfi-checkbox-container-settings">\n\t\t\t\t\t<input type="checkbox" class="mdfi-mark-checkbox-base">\n\t\t\t\t\t<span class="mdfi-checkbox-checkmark"></span>\n\t\t\t\t</label>\n\t\t\t\t<span class="title">${chrome.i18n.getMessage("dwThumbTitle")}</span>\n\t\t\t</div>\n\t\t\t<div class="file">\n\t\t\t\t<div class="mdfi-delim"></div>\n\t\t\t\t<div class="mdfi-settings-field-head">\n\t\t\t\t\t<span class="title">${chrome.i18n.getMessage("fileTitle")}</span>\n\t\t\t\t\t<div class="restore" role="button" tabindex="0">\n\t\t\t\t\t\t<span class="logo"></span>\n\t\t\t\t\t\t<span class="text">${chrome.i18n.getMessage("restoreText")}</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class="input-view">\n\t\t\t\t\t<span id="fileInput" class="wrap" contenteditable="true">&nbsp</span>\n\t\t\t\t</div>\n\t\t\t\t<div class="dropdown">\n\t\t\t\t\t<nav>\n\t\t\t\t\t\t<input type="checkbox" id="fileList">\n\t\t\t\t\t\t<label for="fileList"><span>${chrome.i18n.getMessage("addItem")}</span></label>\n\t\t\t\t\t\t<ul class="list"></ul>\n\t\t\t\t\t</nav>\n\t\t\t\t</div>\n\t\t\t\t<span class="sample">${chrome.i18n.getMessage("settingsExample")}</span>\n\t\t\t\t<p class="iv-settings-note">Folder layout is set in Dashboard Settings. Duplicates are skipped automatically.</p>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="mdfi-settings-control">\n\t\t\t<button type="button" class="cancel">${chrome.i18n.getMessage("settingsCancel")}</button>\n\t\t\t<button type="button" class="save">${chrome.i18n.getMessage("settingsSave")}</button>\n\t\t</div>\n\t\t<div class="iv-settings-dash-wrap">\n\t\t\t<button type="button" class="mdfi-settings-dashboard-link">Folder &amp; Storage Settings →</button>\n\t\t</div>`,
        };
      class E {
        static findInstTitle_interval;
        static missClick_event = null;
        static isMenuCreating = !1;
        static resizeObserver = null;
        static themeObserver = null;
        static sidebarObserver = null;
        static Ke(t, e) {
          let isDark = typeof e === "boolean" ? e : isDarkTheme();
          let targets = [document.documentElement, document.body].filter(Boolean);
          for (let el of targets) {
            if (isDark) el.classList.add("mdfi-dark");
            else el.classList.remove("mdfi-dark");
          }
          if (!E.themeObserver && typeof MutationObserver !== "undefined") {
            const updateTheme = () => {
              let d = isDarkTheme();
              for (let el of [document.documentElement, document.body].filter(Boolean)) {
                el.classList.toggle("mdfi-dark", d);
              }
            };
            E.themeObserver = new MutationObserver(updateTheme);
            if (document.documentElement) {
              E.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["class", "data-theme", "style"]
              });
            }
            if (document.body) {
              E.themeObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ["class", "data-theme", "style"]
              });
            }
            if (window.matchMedia) {
              window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateTheme);
            }
          }
        }
        static async qe(t) {
          let e = document.querySelector(".mdfi-new-main-btn-div-base");
          if (!e) return;
          if (document.querySelector(".mdfi-settings-menu-base")) return;
          let r = isDarkTheme();
          if (await getDownloadStatus())
            return c.Et(chrome.i18n.getMessage("waitDownloadingEnd"));
          let a = null;
          chrome.storage.local.get("settings", async function (t) {
            if (((a = document.querySelector(".mdfi-new-menu-div-base")), a)) {
              if ("none" != a.style.display)
                return void (a.style.display = "none");
              if (
                (E.Ke(a, r),
                (a.style.display = "block"),
                a.querySelector(".mdfi-mark-option-div-base.mdfi-item.active"))
              ) {
                let t = a.querySelector(".mdfi-btn-download");
                (t.disabled && (t.disabled = !1), U.Je());
              } else U.Ve();
              return;
            }
            if (E.isMenuCreating) return;
            E.isMenuCreating = !0;
            let i = document.createElement("div");
            ((i.className = "mdfi-new-menu-div-base"),
              E.Ke(i, r),
              (i.innerHTML = E.Xe()),
              e.after(i),
              await R.Tt(),
              await m.Tt());
            let s = R.Ye() || m.Qt() || null,
              u = s || 100,
              l = "mdfi-header-settings",
              f;
            (
              (i.innerHTML = `\n\t\t<div class="mdfi-haeder">\n\t\t\t<span class="mdfi-header-logo" role="img" aria-label="InstaVault"></span>\n\t\t\t\t<button type="button" class="${l}" aria-label="Extension settings" title="Extension settings" style="border:0;background-color:transparent;padding:0"></button>\n\t\t</div>\n\t\t<div class="mdfi-mark-option-div-base mdfi-item">\n \t\t\t\t<input type="radio" name="check" value="mark" id="radioMark">\n\t\t\t\t<label for="radioMark" aria-label="${chrome.i18n.getMessage("markOptionTitle")}"></label> \n    \t        <div class="mdfi-row-title">\n\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("markOptionTitle")}</div>\n\t\t\t\t<p>${chrome.i18n.getMessage("markOptionDescription")}</p>\n\t\t\t</div>\n\t\t</div>\n\n\t\t\t<div class="mdfi-amount-div-base mdfi-item">\n\t\t\t\t<input type="radio" name="check" value="amount" id="radioAmount">\n\t\t\t\t\t<label for="radioAmount" aria-label="${chrome.i18n.getMessage("amountTitle")}"></label>\n\t\t\t\t\t<div class="mdfi-row-title">\n\t\t\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("amountTitle")}</div>\n\t\t\t\t\t\t<p>${chrome.i18n.getMessage("amountDescription")}</p>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="mdfi-row">\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="fromN">${chrome.i18n.getMessage("fromLbl")}</label>\n\t\t\t\t\t\t\t<input type="number" id="fromN" min="1" value="1">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="toN">${chrome.i18n.getMessage("toLbl")}</label>\n\t\t\t\t\t\t\t<input type="number" id="toN" required="" min="1"\n\t\t\t\t\t\t\t\t   value="${u}">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class="mdfi-date-div-base mdfi-item">\n\t\t\t\t<input type="radio" name="check" value="date" id="radioDate">\n\t\t\t\t\t<label for="radioDate" aria-label="${chrome.i18n.getMessage("dateTitle")}"></label>\n\t\t\t\t\t<div class="mdfi-row-title">\n\t\t\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("dateTitle")}</div>\n\t\t\t\t\t\t<p>${chrome.i18n.getMessage("dateDescription")}</p>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="mdfi-row">\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="fromDate">${chrome.i18n.getMessage("fromLbl")}</label>\n\t\t\t\t\t\t\t<input type="date" id="fromDate">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="toDate">${chrome.i18n.getMessage("toLbl")}</label>\n\t\t\t\t\t\t\t<input type="date" id="toDate">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<button class="mdfi-btn-download" disabled="true">${chrome.i18n.getMessage("downloadBtn")}</button>\n\t\t`));
            let d = document.createElement("span"),
              h;
            if (
              ((d.className = "mdfi-tooltiptext"),
              document.querySelector(".mdfi-checkbox-container"))
            ) {
              i.querySelector("#radioMark").setAttribute("checked", "true");
              let t = i.querySelector(".mdfi-btn-download");
              (t && (E.Qe(t), (t.disabled = !1)), U.Je());
            }
            function v(t) {
              (t.classList.add("disabled"),
                t.querySelectorAll("input").forEach(function (t, e) {
                  t.disabled = !0;
                }));
            }
            const caps = getCurrentCapabilities();
            if (
              (s && (i.querySelector("#fromN").max = s - 1),
              i.querySelector(".mdfi-btn-download").appendChild(E.ti()),
              caps.isSaved || caps.isReelsAudio)
            ) {
              if (
                (v(i.querySelector(".mdfi-date-div-base.mdfi-item")),
                !i.querySelector(
                  ".mdfi-date-div-base.mdfi-item .mdfi-tooltiptext",
                ))
              ) {
                let t = d.cloneNode();
                ((t.textContent = chrome.i18n.getMessage(
                  "disabledOptionToolTip",
                )),
                  i
                    .querySelector(".mdfi-date-div-base.mdfi-item")
                    .appendChild(t));
              }
            }
            if (caps.isSavedPreview) {
              v(i.querySelector(".mdfi-amount-div-base.mdfi-item"));
              {
                let t = d.cloneNode();
                ((t.textContent = chrome.i18n.getMessage(
                  "disabledOptionToolTip",
                )),
                  i
                    .querySelector(".mdfi-amount-div-base.mdfi-item")
                    .appendChild(t));
              }
            }
            if (
              caps.isHomeOrTimeline ||
              caps.isExploreGeneric ||
              caps.isReelsFeed ||
              caps.isPostOrReel ||
              caps.isGuide
            ) {
              let t = i.querySelector(".mdfi-date-div-base.mdfi-item"),
                e = i.querySelector(".mdfi-amount-div-base.mdfi-item");
              if (
                (v(t),
                v(e),
                i
                  .querySelectorAll(".disabled:not(.mdfi-tooltiptext)")
                  .forEach(function (t) {
                    let e = d.cloneNode();
                    ((e.textContent = chrome.i18n.getMessage(
                      "disabledOptionToolTip",
                    )),
                      t.appendChild(e));
                  }),
                caps.isGuide)
              ) {
                (v(i.querySelector(".mdfi-mark-option-div-base.mdfi-item")),
                  (i.querySelector(".mdfi-btn-download").disabled = !0));
              }
            } else if (caps.isUserRoute) {
              let t = document.createElement("span");
              ((t.className = "mdfi-tooltiptext-user-reels"),
                (t.textContent = caps.isUserReels
                  ? chrome.i18n.getMessage("noMaxForReels")
                  : chrome.i18n.getMessage("noMaxForPosts")));
              let e = i.querySelector(
                  ".mdfi-amount-div-base.mdfi-item .mdfi-menu-title-up",
                ),
                n = document.createElement("span");
              ((n.className = "mdfi-reels-amount-tip-icon"),
                n.appendChild(t),
                e.appendChild(n));
            }
            (i.querySelector("#fromN").addEventListener("change", function (t) {
              let e = parseInt(t.target.value),
                n = i.querySelector("#toN");
              n &&
                (e < parseInt(t.target.min) ||
                  e > parseInt(t.target.max) ||
                  e > parseInt(n.value)) &&
                (t.target.value = t.target.min);
            }),
              i.querySelector("#toN").addEventListener("change", function (t) {
                let e = parseInt(t.target.value),
                  n = i.querySelector("#fromN");
                n &&
                  (e < t.target.min ||
                    e > parseInt(t.target.max) ||
                    e < parseInt(n.value)) &&
                  (t.target.value = t.target.max);
              }));
            let p = i.querySelector("#toDate"),
              _ = i.querySelector("#fromDate");
            (_.addEventListener("change", function (t) {
              let e = new Date(t.target.value),
                i = new Date(p.value);
              i < e &&
                (t.target.value = new Date(i).toISOString().split("T")[0]);
            }),
              p.addEventListener("change", function (t) {
                let e = new Date(t.target.value),
                  i = new Date(_.value);
                e < i &&
                  (t.target.value = new Date(i).toISOString().split("T")[0]);
              }));
            let w = new Date();
            (p.setAttribute("max", w.toISOString().split("T")[0]),
              p.setAttribute("value", w.toISOString().split("T")[0]));
            let b = new Date(1e3 * (await getSavedInputDate()));
            (_.setAttribute("value", b.toISOString().split("T")[0]),
              _.setAttribute("max", w.toISOString().split("T")[0]));
            let g = i.querySelector(".mdfi-btn-download");
            g.addEventListener("click", N);
            let k = N;
            i.querySelectorAll('input[type="radio"]').forEach(function (t) {
              (t.checked && t.parentElement.classList.add("active"),
                t.addEventListener("click", function (t) {
                  if (
                    (g.disabled && (g.disabled = !1),
                    (c.isCancelState = !1),
                    i.querySelectorAll(".active").forEach(function (t) {
                      t.classList.remove("active");
                    }),
                    t.target.parentElement.classList.add("active"),
                    (g = i.querySelector(" .mdfi-btn-download")),
                    k && g.removeEventListener("click", k),
                    t.target.value.includes("date"))
                  ) {
                    let t = document.querySelector(
                      ".mdfi-marked-post-lbl-base",
                    );
                    (t && t.remove(),
                      U.isCheckboxesHide || U.Ve(),
                      g.addEventListener("click", P),
                      (k = P));
                  } else if (t.target.value.includes("amount")) {
                    let t = document.querySelector(
                      ".mdfi-marked-post-lbl-base",
                    );
                    (t && t.remove(),
                      g.addEventListener("click", I),
                      (k = I),
                      U.isCheckboxesHide || U.Ve());
                  } else if (t.target.value.includes("mark")) {
                    if (
                      (E.ei(),
                      g.addEventListener("click", N),
                      (k = N),
                      !document.querySelector(".mdfi-mark-checkbox-base"))
                    )
                      return C.Tt();
                    U.isCheckboxesHide && U.Je();
                  }
                }));
            });
            let y = i.querySelector(`.${l}`);
            function $(t) {
              t.composedPath().includes(i) ||
                t.composedPath().includes(e) ||
                i.hasAttribute("mini") ||
                t.composedPath().filter(function (t) {
                  if (t.classList && t.classList.length)
                    return (
                      t.classList.contains("mdfi-checkbox-container") ||
                      t.classList.contains("mdfi-btn-download") ||
                      t.classList.contains("mdfi-new-main-btn-div-base")
                    );
                }).length ||
                ((i.style.display = "none"), U.Ve());
            }
            (y &&
              y.addEventListener("click", function (t) {
                ((i.style.display = "none"), U.Ve(), x.je.call(x));
              }),
              E.missClick_event &&
                (document.removeEventListener("click", $),
                (E.missClick_event = null)),
              document.addEventListener("click", $),
              (E.missClick_event = $),
              (E.isMenuCreating = !1));
          });
        }
        static ii() {
          E.Ke();
          function t() {
            const existing = document.querySelector(".mdfi-new-main-btn-div-base");
            if (existing && existing.isConnected) {
              if (E.findInstTitle_interval) {
                clearInterval(E.findInstTitle_interval);
                E.findInstTitle_interval = null;
              }
              return !0;
            }
            let t = document.querySelector('a[href*="direct/inbox/"]') || document.querySelector('nav a[href="/"]');
            if (!t) return !1;
            let o = n(t);
            if (!o) return !1;
            if (E.findInstTitle_interval) {
              clearInterval(E.findInstTitle_interval);
              E.findInstTitle_interval = null;
            }
            let s = e(i(t), t);
            o.insertBefore(s, o.firstChild);
            E.ni(o);
            E.ri().observe(o);
            return !0;
          }
          function e(t, e) {
            let i = document.createElement("div");
            i.style.position = "relative";
            let n = document.createElement("div");
            return (
              (n.classList = e.firstElementChild.classList),
              (n.style.display = "flex"),
              (n.style.flexDirection = "row"),
              (n.style.padding = "0"),
              (n.style.margin = "0"),
              n.appendChild(t),
              i.appendChild(n),
              i
            );
          }
          function i(t) {
            let e = document.createElement("div");
            e.className = "mdfi-new-main-btn-div-base";
            e.setAttribute("role", "button");
            e.setAttribute("tabindex", "0");
            e.setAttribute("aria-label", chrome.i18n.getMessage("mainBtnNewText") || "InstaVault");
            e.addEventListener("keydown", function (ev) {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                E.qe(ev);
              }
            });
            let i = document.createElement("span");
            (e.addEventListener("click", E.qe),
              (i.className = "mdfi-new-main-btn-base"));
            let n = document.createElement("span"),
              r;
            ((n.className = "mdfi-new-main-btn-span-base"),
              (n.textContent = chrome.i18n.getMessage("mainBtnNewText")),
              t.firstChild && (r = getComputedStyle(t.firstElementChild)),
              r && (i.style.margin = r.paddingLeft));
            let s = t.querySelector("svg");
            if (s) {
              let t = getComputedStyle(s);
              ((i.style.width = t.width), (i.style.height = t.height));
            }
            return (e.appendChild(i), e.appendChild(n), e);
          }
          function n(t) {
            let cur = t;
            for (; (cur = cur.parentElement); )
              if (
                cur.children.length >= 7 &&
                cur.querySelector('[href*="explore"],[href*="reels"],[href="#"]')
              )
                return cur;
            cur = t;
            for (; (cur = cur.parentElement); )
              if (
                cur.children.length >= 4 &&
                cur.querySelector('[href*="explore"],[href*="reels"]')
              )
                return cur;
          }
          function r() {
            if (document.querySelector(".mdfi-new-main-btn-div-base")) return !0;
            if (t()) return !0;
            if (!E.findInstTitle_interval) {
              E.findInstTitle_interval = setInterval(function () {
                if (t()) {
                  if (E.findInstTitle_interval) {
                    clearInterval(E.findInstTitle_interval);
                    E.findInstTitle_interval = null;
                  }
                }
              }, 25);
              setTimeout(function () {
                if (E.findInstTitle_interval) {
                  clearInterval(E.findInstTitle_interval);
                  E.findInstTitle_interval = null;
                }
              }, 1e4);
            }
            if (!E.sidebarObserver && typeof MutationObserver !== "undefined") {
              let target = document.body || document.documentElement;
              let timer = null;
              if (target) {
                E.sidebarObserver = new MutationObserver(function () {
                  if (timer) return;
                  timer = setTimeout(function () {
                    timer = null;
                    const existing = document.querySelector(".mdfi-new-main-btn-div-base");
                    if (!existing || !existing.isConnected) {
                      t();
                    }
                  }, 150);
                });
                E.sidebarObserver.observe(target, { childList: true, subtree: true });
              }
            }
          }
          r();
        }
        static ri() {
          return (
            E.resizeObserver ||
              (E.resizeObserver = new ResizeObserver(function (t) {
                E.ni(t[0].target);
              })),
            E.resizeObserver
          );
        }
        static ni(t) {
          let e = document.querySelector(".mdfi-new-main-btn-span-base"),
            i = t.clientWidth || t.offsetWidth;
          i && e && (e.style.display = i < 160 ? "none" : "flex");
        }
        static async downloadCurrentStorySlide(isHighlight) {
          pauseActiveMedia();
          c.isCancelState = !1;
          O.de();
          c.Pt(10);
          try {
            const route = getCurrentRoute();
            let items = null;
            if (isHighlight) {
              const hid = route.type === "highlight" ? route.highlightId : null;
              if (!hid) return c.Et(chrome.i18n.getMessage("wrongPageType"));
              items = await p.le(hid);
            } else {
              const uname = route.type === "story" ? route.username : null;
              if (!uname) return c.Et(chrome.i18n.getMessage("wrongPageType"));
              const uid = await l.At(uname);
              if (!uid) return c.Et(chrome.i18n.getMessage("noUserInfo"));
              items = await p.fe(uid);
            }
            if (c.isCancelState) return;
            if (!items || !items.length) return c.Et(chrome.i18n.getMessage("userStoriesErr"));
            const current = window.InstaVaultStoryEngine
              ? window.InstaVaultStoryEngine.resolveCurrentSlide(items)
              : items[0];
            c.Pt(50);
            await O.he([current || items[0]]);
          } catch (err) {
            c.Et(chrome.i18n.getMessage("dwErr"));
          }
        }
        static removeStoryBar() {
          const bar = document.querySelector(".iv-story-bar");
          if (bar) bar.remove();
        }
        static postShortcode() {
          const route = getCurrentRoute();
          return route.type === "post" || route.type === "reel" ? route.shortcode : null;
        }
        static siPost(shortcode) {
          const existing = document.querySelector(".iv-post-bar");
          if (existing) {
            if (existing.dataset.shortcode === shortcode) return;
            existing.remove();
          }
          const bar = document.createElement("div");
          bar.className = "iv-post-bar";
          bar.dataset.shortcode = shortcode || "";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mdfi-stories-btn-base iv-post-save-btn";
          btn.setAttribute(
            "aria-label",
            chrome.i18n.getMessage("saveThisPost") || "Save this post",
          );
          const icon = document.createElement("span");
          icon.className = "mdfi-stories-btn-icon single";
          btn.appendChild(icon);
          btn.appendChild(
            document.createTextNode(
              chrome.i18n.getMessage("saveThisPost") || "Save this post",
            ),
          );
          btn.addEventListener("click", () => E.downloadCurrentPost());
          bar.appendChild(btn);
          (document.body || document.documentElement).appendChild(bar);
        }
        static removePostBar() {
          const bar = document.querySelector(".iv-post-bar");
          if (bar) bar.remove();
        }
        static async downloadCurrentPost() {
          const shortcode = E.postShortcode();
          if (!shortcode) return c.Et(chrome.i18n.getMessage("wrongPageType"));
          if (O.Zi() || (await getDownloadStatus()))
            return c.Et(chrome.i18n.getMessage("waitDownloadingEnd"));
          c.isCancelState = false;
          O.de();
          c.Pt(5);
          try {
            const items = await B.Ht(shortcode);
            if (c.isCancelState) return;
            if (!items || items.err || !items.length) {
              return c.Et(chrome.i18n.getMessage("dwErr"));
            }
            items.sort(compareByTakenAtDesc);
            c.Pt(25);
            const res = await O.he(items);
            if (res && res.notAllDw) c.Et(chrome.i18n.getMessage("notAllDwErr"));
          } catch (err) {
            c.Et(chrome.i18n.getMessage("dwErr"));
          }
        }
        static si(t, e) {
          const mode = e ? "highlights" : "stories";
          const existing = document.querySelector(".iv-story-bar");
          if (existing) {
            if (existing.dataset.mode === mode) return;
            existing.remove();
          }
          const bar = document.createElement("div");
          bar.className = "iv-story-bar";
          bar.dataset.mode = mode;

          const singleBtn = document.createElement("button");
          singleBtn.type = "button";
          singleBtn.className = "mdfi-stories-btn-base";
          singleBtn.textContent = "Save this slide";
          singleBtn.addEventListener("click", () => E.downloadCurrentStorySlide(!!e));
          bar.appendChild(singleBtn);

          const i = document.createElement("button");
          i.type = "button";
          i.className = "mdfi-stories-btn-base";
          const n = document.createElement("button");
          n.type = "button";
          n.className = "mdfi-stories-btn-base";
          if (e) {
            i.textContent = chrome.i18n.getMessage("highlightsDw") || "Save this highlight";
            i.addEventListener("click", w);
            n.textContent = chrome.i18n.getMessage("highlightsAllDw") || "Save all highlights";
            n.addEventListener("click", b);
          } else {
            i.textContent = chrome.i18n.getMessage("storiesDownloadBtn") || "Save these stories";
            i.addEventListener("click", g);
            n.textContent = chrome.i18n.getMessage("storiesOfAllUsersDownloadBtn") || "Save all followed stories";
            n.addEventListener("click", _);
          }

          const s = document.createElement("span");
          s.className = "mdfi-stories-btn-icon single";
          i.insertBefore(s, i.firstChild);

          const r = document.createElement("span");
          r.className = "mdfi-stories-btn-icon mass";
          n.insertBefore(r, n.firstChild);

          bar.appendChild(i);
          bar.appendChild(n);
          (document.body || document.documentElement).appendChild(bar);
        }
        static oi(t) {
          (t.stopPropagation(), t.preventDefault());
          let e = document.querySelector(".mdfi-new-menu-div-base");
          if (e.querySelector(".mdfi-mark-option-div-base.mdfi-item.active"))
            return E.ei();
          if (
            (e.setAttribute("mini", !0), !e.querySelector(".mdfi-item.active"))
          )
            return (e.style.display = "none");
          ((e.querySelector(".mdfi-haeder").style.display = "none"),
            e.querySelectorAll(".mdfi-item").forEach(function (t) {
              t.classList.contains("active") || (t.style.display = "none");
            }));
          document.querySelectorAll(".mdfi-new-minimize-menu-div").forEach((el) => el.remove());
          let n = E.ai();
          e.querySelector(".mdfi-btn-download").parentElement.appendChild(n);
        }
        static ui(t) {
          (t.stopPropagation(), t.preventDefault());
          let e = document.querySelector(".mdfi-new-menu-div-base");
          (e.classList.contains("mdfi-new-menu-ultra-min-div-base") &&
            e.classList.remove("mdfi-new-menu-ultra-min-div-base"),
            e.hasAttribute("mini") && e.removeAttribute("mini"));
          let i = document.querySelector(
            ".mdfi-mark-option-div-base.mdfi-item",
          );
          i && (i.style.display = "block");
          let n = document.querySelector(".mdfi-amount-div-base.mdfi-item");
          n && (n.style.display = "block");
          let r = document.querySelector(".mdfi-date-div-base.mdfi-item");
          (r && (r.style.display = "block"),
            document.querySelectorAll(".mdfi-haeder").forEach((t) => {
              t.style.display = "flex";
            }));
          document.querySelectorAll(".mdfi-new-minimize-menu-div, .iv-power-select").forEach((el) => el.remove());
          e.querySelector(".mdfi-haeder").style.display = "flex";
          let o = E.ti();
          e.querySelector(".mdfi-btn-download").parentElement.appendChild(o);
        }
        static ti() {
          let t = document.createElement("div");
          t.className = "mdfi-new-minimize-menu-div";
          let e = document.createElement("button");
          ((e.className = "mdfi-new-expand-menu-btn"),
            e.addEventListener("click", E.oi));
          let i = document.createElement("span");
          return (
            (i.className = "mdfi-new-collapse-btn-logo"),
            e.appendChild(i),
            t.appendChild(e),
            t
          );
        }
        static ai() {
          let t = document.createElement("div");
          t.className = "mdfi-new-minimize-menu-div";
          let e = document.createElement("button");
          ((e.className = "mdfi-new-expand-menu-btn"),
            e.addEventListener("click", E.ui));
          let i = document.createElement("span");
          return (
            (i.className = "mdfi-new-expand-btn-logo"),
            e.appendChild(i),
            t.appendChild(e),
            t
          );
        }
        static Qe(t) {
          if (!document.querySelector(".mdfi-marked-post-lbl-base")) {
            let e = document.createElement("span");
            ((e.id = "markedPostLbl"),
              (e.className = "mdfi-marked-post-lbl-base"),
              (e.textContent = C.ci().toString()),
              t.appendChild(e));
          }
        }
        static applyBulkCheckboxState(boxes, shouldCheck) {
          boxes.forEach((box) => {
            if (box.checked !== shouldCheck) {
              box.checked = shouldCheck;
              D({ target: box, isSynthetic: true });
            }
          });
        }
        static buildPowerSelectBar() {
          return window.InstaVaultPowerSelect.buildPowerSelectBar((boxes, checked) => E.applyBulkCheckboxState(boxes, checked));
        }
        static ei() {
          document
            .querySelectorAll(".mdfi-item,.mdfi-haeder")
            .forEach(function (t) {
              t.style.display = "none";
            });
          document.querySelectorAll(".mdfi-new-minimize-menu-div, .iv-power-select").forEach((el) => el.remove());
          let t = document.querySelector(".mdfi-new-menu-div-base");
          (t.classList.add("mdfi-new-menu-ultra-min-div-base"),
            t.setAttribute("mini", "true"));
          let e = E.ai(),
            i = t.querySelector(".mdfi-btn-download");
          E.Qe(i);
          i.parentElement.appendChild(E.buildPowerSelectBar());
          i.parentElement.appendChild(e);
        }
        static ke() {
          let t = document.querySelector(".mdfi-new-menu-div-base");
          (t && t.remove(),
            E.missClick_event &&
              (document.removeEventListener("click", E.missClick_event),
              (E.missClick_event = null)));
        }
        static Xe() {
          return '\n\t\t<div class="mdfi-skeleton">\n\t\t\t<div class="mdfi-skeleton-left">\n\t\t\t\t<div class="mdfi-skeleton circle"></div>\n\t\t\t</div>\n\t\t\t<div class="mdfi-skeleton-right">\n\t\t\t\t<div class="line"></div>\n\t\t\t\t<div class="line w"></div>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="mdfi-skeleton">\n\t\t\t<div class="mdfi-skeleton-left">\n\t\t\t\t<div class="mdfi-skeleton circle"></div>\n\t\t\t</div>\n\t\t\t<div class="mdfi-skeleton-right">\n\t\t\t\t<div class="mdfi-skeleton-right-top">\n\t\t\t\t\t<div class="line"></div>\n\t\t\t\t\t<div class="line w"></div>\n\t\t\t\t</div>\n\t\t\t\t<div class="mdfi-skeleton-right-bottom">\n\t\t\t\t\t<div class="line i"></div>\t\t\t\n\t\t\t\t\t<div class="line i"></div>\t\t\t\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="mdfi-skeleton">\n\t\t\t<div class="mdfi-skeleton-left">\n\t\t\t\t<div class="mdfi-skeleton circle"></div>\n\t\t\t</div>\n\t\t\t<div class="mdfi-skeleton-right">\n\t\t\t\t<div class="mdfi-skeleton-right-top">\n\t\t\t\t\t<div class="line"></div>\n\t\t\t\t\t<div class="line w"></div>\n\t\t\t\t</div>\n\t\t\t\t<div class="mdfi-skeleton-right-bottom">\n\t\t\t\t\t<div class="line i"></div>\t\t\t\n\t\t\t\t\t<div class="line i"></div>\t\t\t\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>';
        }
      }
      class T {
        static info = null;
        static async Tt() {
          T.info = null;
          let t = null,
            e = null;
          const route = getCurrentRoute();
          const caps = getCurrentCapabilities(route);
          (caps.isExploreTag || caps.isExploreLocation) &&
            (caps.isExploreTag
              ? ((e = getSearchQuery()), e && (t = "tags"))
              : ((e = route.locationId), e && (t = "locations")),
            e &&
              t &&
              ((T.info = await h.qt(t, e).catch(function (t) {
                c.Et(chrome.i18n.getMessage("additionalInfoErr"));
              })),
              (T.info.searchId = e),
              (T.info.type = t)));
        }
        static async di(t) {
          if ((T.info || (await T.Tt()), !getCurrentCapabilities().isExplore))
            return null;
          if (!T.info) return null;
          let e = [];
          if (T.info.infoToDownload && T.info.infoToDownload.length)
            for (let i of T.info.infoToDownload) {
              let n = d.Ft(i),
                r,
                s = t(n[0] || n);
              if (s === FILTER_OK) e = e.concat(n);
              else if (s === FILTER_STOP) break;
            }
          return {
            maxId: (T.info && T.info.maxId) || null,
            nextMediaIds: (T.info && T.info.nextMediaIds) || null,
            pageNum: (T.info && T.info.pageNum) || null,
            postInfoToDownload: e,
          };
        }
        static te() {
          return !(!T.info || !T.info.maxId);
        }
        static ee() {
          return (T.info && T.info.maxId) || null;
        }
        static hi() {
          return (T.info && T.info.searchId) || null;
        }
        static mi() {
          return (T.info && T.info.type) || null;
        }
      }
      async function P(t) {
        ((c.isCancelState = !1), O.de(), await f.Bt());
        let e,
          i = document.querySelector(
            ".mdfi-date-div-base #fromDate",
          ).valueAsNumber,
          n,
          r = document.querySelector(
            ".mdfi-date-div-base #toDate",
          ).valueAsNumber,
          s = !1,
          a = null;
        function u(t) {
          let e = null;
          if (
            ((e =
              t.node && t.node.taken_at_timestamp
                ? t.node.taken_at_timestamp
                : t.media_or_ad && t.media_or_ad.taken_at
                  ? t.media_or_ad.taken_at
                  : t.taken_at || t.takenAt || null),
            !e)
          )
            return FILTER_SKIP;
          let n = 1e3 * e,
            a = new Date(i),
            u = new Date(r),
            c = new Date(n);
          return (
            a.setHours(0, 0, 0, 0),
            u.setHours(0, 0, 0, 0),
            c.setHours(0, 0, 0, 0),
            a <= c && u >= c
              ? FILTER_OK
              : (a < c && u < c) || (a > c && u > c)
                ? FILTER_SKIP
                : ((s = !0), FILTER_STOP)
          );
        }
        let h = [],
          m = null;
        if (c.isCancelState) return;
        const caps = getCurrentCapabilities();
        if ((c.Pt(4), caps.isSaved)) {
          const t = await R.di(u);
          if ((t && t.maxId && (a = t.maxId), t && t.postInfoToDownload))
            for (let e of t.postInfoToDownload) {
              let t = await d.Wt(e);
              h = h.concat(t);
            }
        } else if (caps.isExploreTag || caps.isExploreLocation) {
          const t = await T.di(u());
          ((m = {
            hasNextPage: T.te(),
            searchId: T.hi(),
            type: T.mi(),
            maxId: t.maxId,
            pageNum: t.pageNum,
          }),
            (h = t.postInfoToDownload));
        }
        if ((c.Pt(10), !m && caps.isUserRoute)) {
          let t = R.At(),
            e = R.Ot();
          if (c.isCancelState) return;
          (t || (t = await l.At()),
            (m = {
              maxId: a,
              userName: e,
              userId: t,
              hasNextPage: R.pi() || !0,
            }));
        }
        (m || (m = { maxId: null, hasNextPage: !0 }), c.Pt(20));
        let p = Math.ceil(Math.abs(r - i) / 864e5) || 1,
          _ = 0,
          w = (_ / p) * 50 + 20;
        for (; !s && m.hasNextPage && !c.isCancelState; ) {
          c.Pt(w);
          let t = await v(u, m);
          if (!1 === t) {
            c.Et(chrome.i18n.getMessage("smthWentWrong"));
            break;
          }
          if (!t.postInfoToDownload.length && h.length) break;
          ((m.hasNextPage = t.hasNextPage),
            (m.maxId = t.maxId),
            (h = h.concat(t.postInfoToDownload)),
            _ < p && (_++, (w = (_ / p) * 50 + 20)));
        }
        if (c.isCancelState) return;
        if (!h || !h.length)
          return void c.Et(chrome.i18n.getMessage("noPostsFromDate"));
        h.sort(compareByTakenAtDesc);
        let b = h[0];
        c.isCancelState ||
          O.he(h)
            .then(function (t) {
              (t && t.complete && O._i(b),
                t && t.notAllDw && c.Et(chrome.i18n.getMessage("notAllDwErr")),
                E.ke());
            })
            .catch(function (t) {
              c.Et(chrome.i18n.getMessage("dwErr"));
            });
      }
      async function I(t) {
        ((c.isCancelState = !1), O.de(), await f.Bt());
        let e = document.querySelector(".mdfi-amount-div-base #fromN"),
          i = document.querySelector(".mdfi-amount-div-base #toN"),
          n = 0,
          r = parseInt(i.value) - parseInt(e.value),
          s = 0,
          a = 0;
        function u() {
          return (
            a++,
            s > r
              ? FILTER_STOP
              : a >= e.value && s <= r
                ? (s++, FILTER_OK)
                : a < e.value && s <= r
                  ? FILTER_SKIP
                  : void 0
          );
        }
        let h = [],
          p = null;
        c.Pt(2);
        let _ = null;
        const caps = getCurrentCapabilities();
        if (caps.isSavedAll) {
          ((_ = await R.di(u)), _ && _.maxId && (n = _.maxId));
          let t = 0;
          if (_ && _.postInfoToDownload)
            for (let e of _.postInfoToDownload) {
              t++;
              let i = (t / r) * 10 + 3;
              c.Pt(i);
              let n = await d.Wt(e);
              h = h.concat(n);
            }
        } else
          caps.isExploreTag || caps.isExploreLocation
            ? ((_ = await T.di(u)),
              (p = {
                hasNextPage: T.te(),
                searchId: T.hi(),
                type: T.mi(),
                maxId: _.maxId,
                pageNum: _.pageNum,
              }),
              (h = _.postInfoToDownload))
            : caps.isReelsAudio &&
              ((_ = await m.Yt(u)),
              (p = { hasNextPage: m.te(), maxId: m.ee(), audioId: m.ie() }),
              (h = _));
        if ((c.Pt(3), !p && caps.isUserRoute)) {
          let t = null,
            e = null;
          (void 0 !== R.At() && (t = R.At()),
            void 0 !== R.Ot() && (e = R.Ot()),
            t || (t = await l.At()),
            (p = {
              maxId: n,
              userName: e,
              userId: t,
              hasNextPage: R.pi() || !0,
            }));
        }
        for (
          p || (p = { maxId: null, hasNextPage: !0 });
          s <= r && p.hasNextPage && !c.isCancelState;
        ) {
          let t = (s / r) * 50 + 1 + 3;
          c.Pt(t);
          let e = await v(u, p);
          if (!1 === e) {
            c.Et(chrome.i18n.getMessage("smthWentWrong"));
            break;
          }
          if (!e.postInfoToDownload.length && h.length) break;
          ((p.hasNextPage = e.hasNextPage || !1),
            (p.maxId = e.maxId),
            (h = h.concat(e.postInfoToDownload)));
        }
        if (c.isCancelState) return;
        if (!h || !h.length)
          return void c.Et(chrome.i18n.getMessage("smthWentWrong"));
        h.sort(compareByTakenAtDesc);
        let w = h[0];
        c.isCancelState ||
          O.he(h)
            .then(function (t) {
              (t && t.complete && O._i(w),
                t && t.notAllDw && c.Et(chrome.i18n.getMessage("notAllDwErr")),
                E.ke());
            })
            .catch(function (t) {
              c.Et(chrome.i18n.getMessage("dwErr"));
            });
      }
      async function A() {
        let t = null,
          e = !0,
          i = [];
        for (await f.Bt(); !c.isCancelState || !e; ) {
          let n = await B.se(t);
          if (((t = n.maxId || null), (e = n.hasNextPage || !1), !n || n.err))
            return c.Et(chrome.i18n.getMessage("userSavedNoPostsErr"));
          if (
            (n.feedInfo.forEach(function (t) {
              let e = d.Ft(t);
              i = i.concat(e);
            }),
            !t)
          )
            break;
        }
        return i;
      }
      async function S(t) {
        ((c.isCancelState = !1), O.de());
        let e = [];
        await f.Bt();
        const i = C.ci();
        if (!i) return c.Et(chrome.i18n.getMessage("markOptionDescription"));
        let n = await B.wi();
        for (; C.ci() && !c.isCancelState; ) {
          let t = null,
            r,
            s = ((i - C.ci()) / i) * 50;
          c.Pt(s);
          let o = C.bi();
          C.gi();
          let a = n.find((t) => t.collection_name === o);
          if (!a) continue;
          if (a.collection_id.toString().toLowerCase().includes("all")) {
            c.Pt(s + 7);
            let t = await A();
            ((t = t.map((t) => ({ ...t, collectionName: o }))),
              (e = e.concat(t)));
            continue;
          }
          let u = 0;
          for (; t || u < a.feed_posts_count; ) {
            if (
              ((r = await B.oe(a.collection_id, t)),
              (t = r.maxId || null),
              !r || r.err)
            )
              return c.Et(chrome.i18n.getMessage("userSavedNoPostsErr"));
            if (
              (r.feedInfo.forEach(function (t) {
                u++;
                let i = d.Ft(t);
                ((i = i.map((t) => ({ ...t, collectionName: o }))),
                  (e = e.concat(i)));
              }),
              !t)
            )
              break;
          }
        }
        if (c.isCancelState) return;
        if (!e || !e.length)
          return void c.Et(chrome.i18n.getMessage("smthWentWrong"));
        e.sort(compareByTakenAtDesc);
        let r = e[0];
        c.isCancelState ||
          (O.he(e)
            .then(function (t) {
              (t && t.complete && O._i(r),
                t && t.notAllDw && c.Et(chrome.i18n.getMessage("notAllDwErr")),
                E.ke());
            })
            .catch(function (t) {
              c.Et(chrome.i18n.getMessage("dwErr"));
            }),
          U.ki());
      }
      async function N(t) {
        if (getCurrentCapabilities().isSavedPreview) return S(t);
        if (!C.ci() && E.postShortcode()) return E.downloadCurrentPost();
        (await f.Bt(), (c.isCancelState = !1), O.de());
        let e = [],
          i = !1;
        const n = C.ci();
        if (!n) return c.Et(chrome.i18n.getMessage("markOptionDescription"));
        for (; C.ci() && !c.isCancelState; ) {
          let t = ((n - C.ci()) / n) * 50;
          c.Pt(t);
          let r = C.bi();
          if ((C.gi(), !r)) continue;
          let s = await B.Ht(r);
          s.err ? (i = !0) : ((i = !1), (e = e.concat(s)));
        }
        if (c.isCancelState) return;
        if (i) {
          c.Pt(20);
          let t = await B.yi();
          (c.Pt(50), (e = e.concat(t)));
        }
        if (!e || !e.length)
          return void c.Et(chrome.i18n.getMessage("smthWentWrong"));
        e.sort(compareByTakenAtDesc);
        let r = e[0];
        c.isCancelState ||
          (O.he(e)
            .then(function (t) {
              (t && t.complete && O._i(r),
                t && t.notAllDw && c.Et(chrome.i18n.getMessage("notAllDwErr")),
                E.ke());
            })
            .catch(function (t) {
              c.Et(chrome.i18n.getMessage("dwErr"));
            }),
          U.ki());
      }
      let ivLastClickedCb = null;
      document.addEventListener("click", function (ev) {
        const cb = ev.target && ev.target.classList && ev.target.classList.contains("mdfi-mark-checkbox-base") ? ev.target : null;
        if (!cb) return;
        if (ev.shiftKey && ivLastClickedCb && ivLastClickedCb !== cb) {
          const boxes = Array.from(document.querySelectorAll(".mdfi-mark-checkbox-base")).filter(
            (b) => b.closest(".mdfi-checkbox-container") && b.closest(".mdfi-checkbox-container").style.display !== "none"
          );
          const start = boxes.indexOf(ivLastClickedCb);
          const end = boxes.indexOf(cb);
          if (start !== -1 && end !== -1) {
            const [lo, hi] = start < end ? [start, end] : [end, start];
            const targetState = cb.checked;
            for (let idx = lo; idx <= hi; idx++) {
              if (boxes[idx] !== cb && boxes[idx].checked !== targetState) {
                boxes[idx].checked = targetState;
                D({ target: boxes[idx], isSynthetic: true });
              }
            }
          }
        }
        ivLastClickedCb = cb;
      }, true);
      function D(t) {
        let e = null;
        const route = getCurrentRoute();
        const caps = getCurrentCapabilities(route);
        if (!route.type || route.type === "unknown") return;
        if (caps.isHomeOrTimeline) e = B.$i(t.target);
        else if (caps.isReelsFeed)
          (t.target.parentElement.hasAttribute("shortcode") &&
            (e = t.target.parentElement.getAttribute("shortcode")),
            e || (e = getReelShortcode(route)));
        else if (caps.isSavedPreview)
          t.target.parentElement.hasAttribute("collection-name") &&
            (e = t.target.parentElement.getAttribute("collection-name"));
        else {
          let i = t.target.parentNode.nextSibling;
          if (i && i.href) {
            let t = i.href.match("(?<=/p/).*?(?=/)|(?<=/reel/).*?(?=/)");
            e = t && t[0];
          } else e = B.$i(t.target);
        }
        if ((!e && caps.isPostOrReel && (e = route.shortcode), !e)) return null;
        t.target.checked ? C.xi(e) : C.Ei(e);
        let i = document.querySelector(
          ".mdfi-marked-post-lbl-base#markedPostLbl",
        );
        i && (i.textContent = C.ci().toString());
      }
      class U {
        static posts_interval;
        static isCheckboxesHide = !1;
        static Ti(t, e = null) {
          if (!t || t.querySelector(".mdfi-checkbox-container")) return;
          let i = document.createElement("input");
          ((i.type = "checkbox"),
            (i.className = "mdfi-mark-checkbox-base"),
            i.addEventListener("change", D));
          let n = document.createElement("span");
          n.className = "mdfi-checkbox-checkmark";
          let r = document.createElement("label");
          ((r.className = "mdfi-checkbox-container"),
            r.appendChild(i),
            r.appendChild(n),
            t.appendChild(r));
          let s = e || B.$i(t);
          s && C.Pi(s) > -1 && (i.checked = !0);
        }
        static Ii() {
          let t = document.querySelectorAll("article img,article video");
          if (t && t.length) {
            for (let n of t) {
              if (
                "img" === n.tagName.toLowerCase() &&
                (n.width < 200 || n.height < 200)
              )
                continue;
              let t = e(n.closest("article")) || i(n);
              U.Ti(t);
            }
            (U.posts_interval &&
              (clearInterval(U.posts_interval), (U.posts_interval = null)),
              (U.posts_interval = setInterval(function () {
                U.isCheckboxesHide ||
                  (() => {
                    if (getCurrentRoute().type !== "home") return;
                    let n = document.querySelectorAll(
                      "article img,article video",
                    );
                    if (n || !n.length)
                      for (let t of n) {
                        if (
                          "img" === t.tagName.toLowerCase() &&
                          (t.width < 200 || t.height < 200)
                        )
                          continue;
                        let n = e(t.closest("article")) || i(t);
                        U.Ti(n);
                      }
                  })();
              }, 500)));
          } else c.Et(chrome.i18n.getMessage("noPostsForCheckboxErr"));
          function e(t) {
            if (!t.querySelector("header")) return null;
            const i = void 0;
            return (
              [].find.call(t.children, function (t) {
                return !t.querySelector("header");
              }) ||
              (t.firstElementChild && e(t.firstElementChild))
            );
          }
          function i(t) {
            try {
              let e = t.clientHeight || t.offsetHeight;
              for (
                ;
                (t.parentElement.clientHeight || t.parentElement.offsetHeight) <
                e + 100;
              )
                if ("article" === (t = t.parentElement).tagName.toLowerCase())
                  return null;
              return t;
            } catch (t) {}
          }
        }
        static Ai() {
          let t = document.querySelectorAll(
            'a[href*="/p/"] ,a[href*="/reel/"]',
          );
          function e(t) {
            if (t.parentElement.querySelector(".mdfi-mark-checkbox-base"))
              return;
            if (
              "img" === t.tagName.toLowerCase() &&
              (t.width < 300 || t.height < 300)
            )
              return;
            if ("a" === t.tagName.toLowerCase()) {
              let e;
              if (!t.href.match(/(\/p\/[^\/]*.\/$)|(\/reel\/[^\/]*.\/$)/))
                return;
            }
            let e;
            const route = getCurrentRoute();
            if (
              getCurrentCapabilities(route).isPostOrReel &&
              ((e = route.shortcode), e && t.href && t.href.includes(e))
            )
              return;
            let i = document.createElement("input");
            i.type = "checkbox";
            let n = randomFallbackId().toString();
            ((i.id = "postChkBox" + n),
              (i.className = "mdfi-mark-checkbox-base"),
              i.addEventListener("change", D));
            let r = document.createElement("span");
            r.className = "mdfi-checkbox-checkmark";
            let s = document.createElement("label");
            (s.setAttribute("for", "postChkBox" + n),
              (s.className = "mdfi-checkbox-container"),
              s.appendChild(i),
              s.appendChild(r),
              t.parentElement.insertBefore(s, t),
              !e &&
                t.href &&
                ((e = t.href.match("(?<=/p/).*?(?=/)|(?<=/reel/).*?(?=/)")),
                (e = e && e[0])),
              e && C.Pi(e) > -1 && (i.checked = !0));
          }
          for (let i of t) e(i);
          (U.posts_interval &&
            (clearInterval(U.posts_interval), (U.posts_interval = null)),
            (U.posts_interval = setInterval(function () {
              U.isCheckboxesHide ||
                resolvePageRoute(function (t) {
                  if (!t) return;
                  let i = document.querySelectorAll(
                    'a[href*="/p/"] ,a[href*="/reel/"]',
                  );
                  if (i || !i.length) for (let t of i) e(t);
                });
            }, 500)));
          let i = document.querySelectorAll(
            'div[role*="button"] img,div[role*="button"] video',
          );
          if (i && i.length)
            for (let t of i) {
              if (
                "img" === t.tagName.toLowerCase() &&
                (t.width < 200 || t.height < 200)
              )
                continue;
              if (t.querySelector(".mdfi-mark-checkbox-base")) continue;
              if (
                t
                  .closest('div[role*="button"]')
                  .querySelector(".mdfi-mark-checkbox-base")
              )
                continue;
              const r = getCurrentRoute();
              let e = r.type === "post" || r.type === "reel" ? r.shortcode : null;
              e && U.Ti(t.parentElement.parentElement, e);
            }
        }
        static Si() {
          let t = document.querySelectorAll("video:not([mdfi-check])"),
            e;
          for (let i of t)
            if (!i.paused) {
              e = i;
              break;
            }
          if (!e) return !1;
          let i = document.createElement("input");
          ((i.type = "checkbox"),
            (i.className = "mdfi-mark-checkbox-base"),
            i.addEventListener("change", D));
          let n = document.createElement("span");
          n.className = "mdfi-checkbox-checkmark";
          let r = document.createElement("label");
          ((r.className = "mdfi-checkbox-container"),
            r.appendChild(i),
            r.appendChild(n),
            e.parentElement.insertBefore(r, e));
          let s = getReelShortcode();
          return (
            s && r.setAttribute("shortcode", s),
            e.setAttribute("mdfi-check", "true"),
            s && C.Pi(s) > -1 && (i.checked = !0),
            !0
          );
        }
        static Ni() {
          const t = void 0;
          return (
            document
              .querySelectorAll(
                'section main [role="navigation"] div[aria-label],section main a[aria-label]',
              )
              .forEach(function (t) {
                let e = t.innerText.trim();
                if (!e) return;
                let i = document.createElement("input");
                ((i.type = "checkbox"),
                  (i.className = "mdfi-mark-checkbox-base"),
                  i.addEventListener("change", D));
                let n = document.createElement("span");
                n.className = "mdfi-checkbox-checkmark";
                let r = document.createElement("label");
                ((r.className = "mdfi-checkbox-container"),
                  r.appendChild(i),
                  r.appendChild(n),
                  e && r.setAttribute("collection-name", e),
                  (t.parentElement.style.position = "relative"),
                  t.parentNode.insertBefore(r, t.parentNode.firstElementChild));
              }),
            !0
          );
        }
        static Ve() {
          let t = document.querySelectorAll(".mdfi-checkbox-container");
          (t.forEach(function (t) {
            t.style.display = "none";
          }),
            t && t.length && (U.isCheckboxesHide = !0));
        }
        static Je() {
          (document
            .querySelectorAll(".mdfi-checkbox-container")
            .forEach(function (t) {
              t.style.display = "flex";
            }),
            (U.isCheckboxesHide = !1));
        }
        static ki() {
          ((C.shortcodesToDw = []),
            document
              .querySelectorAll(".mdfi-checkbox-container")
              .forEach(function (t) {
                t.remove();
              }),
            document
              .querySelectorAll("video[mdfi-check]")
              .forEach(function (t) {
                t.removeAttribute("mdfi-check");
              }),
            (U.isCheckboxesHide = !1),
            U.posts_interval &&
              (clearInterval(U.posts_interval), (U.posts_interval = null)));
        }
      }
      class C {
        static shortcodesToDw = [];
        static Di(t, e, i) {
          function n() {
            (s && clearTimeout(s),
              (s = null),
              r && clearInterval(r),
              (r = null));
          }
          getCurrentCapabilities().isReelsFeed || chrome.runtime.onMessage.removeListener(C.Di);
          let r = null,
            s = null;
          return (
            "reelFeedScroll" === t.message &&
              (n(),
              (r = setInterval(function () {
                U.Si() && n();
              }, 100)),
              setTimeout(function () {
                n();
              }, 3e3)),
            !0
          );
        }
        static Tt() {
          (chrome.runtime.onMessage.removeListener(C.Di),
            (C.shortcodesToDw = []),
            (U.isCheckboxesHide = !1),
            (() => {
              const caps = getCurrentCapabilities();
              caps.isHomeOrTimeline
                ? U.Ii()
                : caps.isReelsAudio
                  ? U.Ai()
                  : caps.isReelsFeed
                    ? (U.Si(), chrome.runtime.onMessage.addListener(C.Di))
                    : caps.isSavedPreview
                      ? U.Ni()
                      : U.Ai();
            })());
        }
        static xi(t) {
          C.shortcodesToDw.push(t);
        }
        static Ei(t) {
          const e = C.shortcodesToDw.indexOf(t);
          return e > -1 && (C.shortcodesToDw.splice(e, 1), !0);
        }
        static gi() {
          C.shortcodesToDw.splice(0, 1);
        }
        static bi() {
          return C.shortcodesToDw[0];
        }
        static ci() {
          return C.shortcodesToDw.length;
        }
        static Pi(t) {
          return C.shortcodesToDw.indexOf(t);
        }
      }
      class B {
        static Ui() {
          return Promise.resolve({});
        }
        static wi(t) {
          return new Promise(function (t, e) {
            chrome.runtime.sendMessage(
              { title: "get_user_saved_collection_base_info" },
              function (i) {
                if (!i || (i && i.err)) return e();
                t(i);
              },
            );
          });
        }
        static ne(t, e, i) {
          return new Promise(function (n, r) {
            chrome.runtime.sendMessage(
              { title: "get_user_posts_alt", userName: e, endCursor: i },
              function (s) {
                return !s || (s && s.err)
                  ? r()
                  : s.tryUserPost
                    ? n(B.Ci(t, e, i))
                    : void n(s);
              },
            );
          });
        }
        static Ci(t, e, i) {
          return new Promise(function (n, r) {
            chrome.runtime.sendMessage(
              { title: "get_user_posts", userId: t, userName: e, endCursor: i },
              function (t) {
                if (!t || (t && t.err)) return r();
                n(t);
              },
            );
          });
        }
        static re(t, e) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_user_saved_posts", userId: t, endCursor: e },
              function (t) {
                if (!t || (t && t.err)) return i({ err: !0 });
                i(t);
              },
            );
          });
        }
        static oe(t, e) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              {
                title: "get_user_saved_collection_posts",
                collectionId: t,
                endCursor: e,
              },
              function (t) {
                if (!t || (t && t.err)) return i({ err: !0 });
                i(t);
              },
            );
          });
        }
        static se(t) {
          return new Promise(function (e, i) {
            chrome.runtime.sendMessage(
              { title: "get_user_saved_posts_alt", endCursor: t },
              function (t) {
                if (!t || (t && t.err)) return i();
                e(t);
              },
            );
          });
        }
        static ae(t, e) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_user_tag_posts", userId: t, maxId: e },
              function (t) {
                if (!t || (t && t.err)) return n();
                i(t);
              },
            );
          });
        }
        static ue(t, e = null) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_reels_posts", userId: t, maxId: e },
              function (t) {
                if (!t || (t && t.err)) return n();
                i(t);
              },
            );
          });
        }
        static Xt(t, e = null) {
          return new Promise(function (i, n) {
            chrome.runtime.sendMessage(
              { title: "get_reels_audio", audioId: t, maxId: e },
              function (t) {
                if (!t || (t && t.err)) return n();
                i(t);
              },
            );
          });
        }
        static $i(t) {
          let e = t.closest("article");
          e || (e = t.parentElement);
          let i = e.querySelector('a[href*="/p/"]');
          if (!i) return null;
          let n = null;
          return (
            i.href || (n = getReelShortcode()),
            n ||
              ((n = i.href && i.href.match(/(?<=\/p\/).*?(?=\/)/)),
              (n = n[0] || null)),
            n
          );
        }
        static jt(t) {
          return new Promise(function (e, i) {
            chrome.runtime.sendMessage(
              { title: "get_post_info", postId: t },
              function (t) {
                if (!t || (t && t.err)) return i();
                e(t);
              },
            );
          });
        }
        static Ht(t) {
          return new Promise(function (e, i) {
            let n = shortcodeToPk(t);
            chrome.runtime.sendMessage(
              {
                title: "get_media_from_post",
                pk: n,
                userName: R.Ot(),
                collectionName: R.Lt(),
                pageType: getCurrentRoute().type || null,
                toDwThumb: f.Ut,
              },
              function (t) {
                if (!t || (t && t.err)) return e({ err: !0 });
                e(t);
              },
            );
          });
        }
        static yi() {
          return new Promise(async function (t, e) {
            let i = [],
              n = null;
            function r(t) {
              return (
                !(!t.media_or_ad || !t.media_or_ad.code) &&
                C.Ei(t.media_or_ad.code)
              );
            }
            const caps = getCurrentCapabilities();
            if (caps.isSavedAll) {
              let t = await R.di(r());
              if ((t && t.maxId && (n = t.maxId), t && t.postInfoToDownload))
                for (let e of t.postInfoToDownload) {
                  let t = await d.Wt(e);
                  i = i.concat(t);
                }
            }
            let s = null;
            void 0 !== R.At() && (s = R.At());
            let a = null;
            (void 0 !== R.Ot() && (a = R.Ot()),
              caps.isUserRoute && !s && (s = await l.At()));
            let u = R.pi() || !0;
            const f = C.ci();
            for (; C.ci() && u; ) {
              let t = (i.length / f) * 50;
              c.Pt(t);
              let e = await v(r, n, a, s);
              if (!e) {
                c.Et(chrome.i18n.getMessage("smthWentWrong"));
                break;
              }
              ((u = e.hasNextPage),
                (n = e.maxId),
                (i = i.concat(e.postInfoToDownload)));
            }
            t(i);
          });
        }
      }
      class R {
        static info = {};
        static async Tt() {
          R.info = {};
          const route = getCurrentRoute();
          const caps = getCurrentCapabilities(route);
          if (caps.isSavedAll) {
            let t = await l.At();
            t &&
              (R.info = await B.Ui(t).catch(function () {
                c.Et(chrome.i18n.getMessage("additionalInfoErr"));
              }));
          } else if (caps.isUserRoute) {
            let t = getRouteUsername(route);
            (t &&
              (R.info = await l.St(t).catch(function () {
                c.Et(chrome.i18n.getMessage("additionalInfoErr"));
              })),
              caps.isSavedCollection &&
                (R.info || (R.info = {}),
                (R.info.collectionInfo = await B.wi().catch(function () {
                  c.Et(chrome.i18n.getMessage("additionalInfoErr"));
                }))));
          }
        }
        static async di(t) {
          R.info || (await R.Tt());
          let e = "",
            i = [];
          if (!getCurrentCapabilities().isUserRoute) return null;
          if (!R.info) return null;
          if (
            (R.info.maxId && R.info.hasNextPage && (e = R.info.maxId),
            R.info.endCursor && R.info.hasNextPage && (e = R.info.endCursor),
            R.info && R.info.postsFeedInfo)
          )
            for (let e of R.info.postsFeedInfo) {
              let n = t(e);
              if (n === FILTER_OK) i.push(e);
              else if (n === FILTER_STOP) break;
            }
          return { maxId: e, postInfoToDownload: i };
        }
        static Ye() {
          const route = getCurrentRoute();
          if (
            getCurrentCapabilities(route).isSavedCollection &&
            R.info &&
            Array.isArray(R.info.collectionInfo)
          )
            for (let t of R.info.collectionInfo)
              if (t.collection_id == getCollectionId(route)) return t.feed_posts_count;
          return (R.info && R.info.postsAmount) || null;
        }
        static pi() {
          return (R.info && R.info.hasNextPage) || null;
        }
        static At() {
          return (R.info && R.info.userId) || null;
        }
        static Ot() {
          return (R.info && R.info.userName) || null;
        }
        static Lt() {
          if (!R.info || !R.info.collectionInfo) return null;
          let t = getCollectionId();
          if (!t) return null;
          for (let e of R.info.collectionInfo)
            if (e.collection_id == t) return e.collection_name;
          return null;
        }
      }
      class F {
        Fi;
        Oi;
        constructor() {
          ((this.Fi = null), (this.Oi = {}));
        }
        async Tt() {
          let t = this,
            e = await f.Ct();
          t.Fi = (e && e.fileNamePattern) || f.Dt.fileNamePattern;
        }
        Li(t) {
          const e = /[\x00-\x1F.]+/g,
            i = 255;
          return (
            (t = t.replace(e, "_")).length > i && (t = t.slice(0, 245) + "..."),
            t
          );
        }
        Mi(t, e) {
          this.Oi || (this.Oi = {});
          let i = $.We(this.Fi),
            n = this.Wi(t, i);
          (e.includes("saved") &&
            t.collectionName &&
            (n = `${t.collectionName}/${n}`),
            (n = this.Li(n)),
            null !== t.index &&
              void 0 !== t.index &&
              (n += `${f.Nt}${t.index}`));
          let r = `${n}.${t.fileExt}`;
          if (void 0 !== this.Oi[r]) {
            let e;
            r = `${n}${++this.Oi[r]}.${t.fileExt}`;
          } else this.Oi[r] = 0;
          return r;
        }
        Wi(t, e) {
          return e
            .map((e) =>
              "field" === e.type
                ? t[e.value] || ""
                : "static" === e.type
                  ? e.value
                  : void 0,
            )
            .join("");
        }
      }
      class O {
        static downloadingFlag;
        static _i(t) {
          const route = getCurrentRoute();
          if (!(t && t.userName && t.takenAt && getCurrentCapabilities(route).isUserRoute))
            return;
          let e = t.userName + "_" + route.type;
          chrome.storage.local.get("inputDate", function (i) {
            let n = (i && i.inputDate) || {};
            n[e] > t.takenAt ||
              ((n[e] = t.takenAt), chrome.storage.local.set({ inputDate: n }));
          });
        }
        static Zi() {
          return (
            void 0 === O.downloadingFlag && (O.downloadingFlag = !1),
            O.downloadingFlag
          );
        }
        static de() {
          O.downloadingFlag = !0;
        }
        static he(t) {
          return new Promise(async function (i) {
            let r = new F();
            await r.Tt();
            let w = getCurrentRoute().type || "";
            const res = await window.InstaVaultClient.dispatchBatch(t, {
              buildFilename: (item) => r.Mi(item, w),
              isCancelled: () => c.isCancelState,
              onProgress: (pct) => c.Pt(pct),
            });
            O.downloadingFlag = !1;
            if (res.cancelled) return i();
            if (!res.notAllDw) c.Pt(100);
            i({ complete: !0, notAllDw: res.notAllDw });
          });
        }
      }
      const Z = 767;
      function G(t = !1) {
        E.si(null, t);
      }
      function H() {
        E.Ke();
        E.ii();
        E.removePostBar();
        const route = getCurrentRoute();
        if (route.type === "highlight") {
          G(!0);
        } else if (route.type === "story") {
          G(!1);
        } else {
          E.removeStoryBar();
          const shortcode = E.postShortcode();
          if (shortcode) E.siPost(shortcode);
        }
        resolvePageRoute(function (resolved) {
          resolved && resolved.type === "story"
            ? G(!1)
            : resolved && resolved.type === "highlight"
              ? G(!0)
              : U.Ve();
        });
      }
      function K() {
        if (window.InstaVaultClient) window.InstaVaultClient.startKeepAlive(5);
      }
      function J() {
        let lastPageName;
        let lastHref = location.href;
        const postRouteNames = ["p", "reel"];
        E.Ke();
        (K(),
          H(),
          window.addEventListener(
            "resize",
            function (t) {
              t.target.outerWidth > Z && H();
            },
            !0,
          ));

        function handleNavigation(pageName) {
          const currentHref = location.href;
          if (currentHref === lastHref) return;
          lastHref = currentHref;
          if (pageName !== undefined) {
            (((postRouteNames.includes(pageName) ||
              pageName === lastPageName ||
              postRouteNames.includes(lastPageName)) &&
              null !== pageName) ||
              (U.ki(), E.ke()),
            ((postRouteNames.includes(lastPageName) && postRouteNames.includes(pageName)) ||
              (void 0 === lastPageName && postRouteNames.includes(pageName))) &&
              (U.ki(), E.ke()),
            postRouteNames.includes(pageName) || (lastPageName = pageName));
          } else {
            U.ki();
            E.ke();
          }
          H();
        }

        chrome.runtime.onMessage.addListener(function (i, n, r) {
          if ("url" === i.message) {
            handleNavigation(i.pageName);
            r(!0);
            return !0;
          }
          if ("isDownload" === i.message) {
            r({ isDownload: O.Zi() });
            return !0;
          }
          return !0;
        });

        const onNavCheck = () => handleNavigation(undefined);
        window.addEventListener("popstate", onNavCheck);
        setInterval(onNavCheck, 800);
        window.addEventListener("beforeunload", () => {
          O.downloadingFlag = !1;
        });
      }
      J();
})();

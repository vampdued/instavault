(() => {
  var e = [
      ,
      (e) => {
        e.exports = (function () {
          return class e {
            static _scrollDefaultTm = 1500;
            static _scrollTm = e._scrollDefaultTm;
            static t(e, t, r) {
              fetch(e, t)
                .then(function (e) {
                  if (200 !== e.status) throw new Error("request error");
                  return e.json();
                })
                .then(r)
                .catch(function (e) {
                  r({ err: !0, text: e });
                });
            }
            static i(t, r, n) {
              setTimeout(function () {
                fetch(t, r)
                  .then(function (e) {
                    if (200 !== e.status)
                      throw (
                        e.text().then((e) => {}),
                        "request err _ " + e.status
                      );
                    return e.json();
                  })
                  .then(function (t) {
                    return ((e._scrollTm = e._scrollDefaultTm), n(t));
                  })
                  .catch(function (i) {
                    return e._scrollTm > 5 * e._scrollDefaultTm
                      ? ((e._scrollTm = e._scrollDefaultTm), n({ err: !0 }))
                      : ((e._scrollTm += e._scrollDefaultTm), e.i(t, r, n));
                  });
              }, e._scrollTm);
            }
          };
        })();
      },
      (e, t, r) => {
        const n = r(3);
        e.exports = (function () {
          return class e {
            static l(e) {
              let t = new URL(e.url);
              if (!t) return;
              if (!e.initiator || !e.initiator.includes("instagram.com"))
                return;
              const r = new URLSearchParams(t.search);
              let n = JSON.parse(r.get("variables"));
              if (!n) {
                n = {};
                for (const [e, t] of r)
                  n[e] = "true" === t || ("false" !== t && t);
              }
              let i = t.searchParams.get("query_hash");
              let o = t.searchParams.get("doc_id");
              o &&
                n &&
                n.fb_api_req_friendly_name &&
                chrome.storage.local.get("instaDocIds", function (e) {
                  let t = (e && e.instaDocIds) || {};
                  t[n.fb_api_req_friendly_name] !== o &&
                    ((t[n.fb_api_req_friendly_name] = o),
                    chrome.storage.local.set({ instaDocIds: t }));
                });
              n && i
                ? chrome.tabs.get(e.tabId, function (e) {
                    if (!e.url) return;
                    let t = e.url;
                    chrome.storage.local.get("instaQueryHash", function (e) {
                      let r = e.instaQueryHash || {};
                      if (
                        void 0 !== n.child_comment_count &&
                        void 0 !== n.shortcode
                      )
                        return (
                          (r.forSinglePost = i),
                          void chrome.storage.local.set({ instaQueryHash: r })
                        );
                      if (
                        void 0 !== n.user_id &&
                        void 0 !== n.include_chaining &&
                        void 0 !== n.include_reel &&
                        void 0 !== n.include_highlight_reels
                      )
                        return (
                          (r.forHighlightsList = i),
                          void chrome.storage.local.set({ instaQueryHash: r })
                        );
                      if (void 0 !== n.id && void 0 !== n.first) {
                        if (t.includes("/saved/")) r.forUserSavedPosts = i;
                        else if (t.includes("/tagged/")) r.forUserTagPosts = i;
                        else {
                          if (t.includes("/guides/")) return;
                          if (t.includes("/explore/")) return;
                          if (!t.match("instagram.com/([^/]+)/$")) return;
                          r.forUserAllPosts = i;
                        }
                        chrome.storage.local.set({ instaQueryHash: r });
                      }
                    });
                  })
                : void 0 !== n.user_id &&
                  void 0 !== n.include_chaining &&
                  void 0 !== n.include_reel &&
                  void 0 !== n.include_highlight_reels &&
                  void 0 !== n.query_id &&
                  chrome.storage.local.get("instaQueryHash", function (e) {
                    let t = e.instaQueryHash || {};
                    ((t.forHighlightsListId = n.query_id),
                      chrome.storage.local.set({ instaQueryHash: t }));
                  });
            }
            static _(e) {
              !e.requestHeaders ||
                e.requestHeaders.length < 1 ||
                chrome.storage.local.get(n.h, function (t) {
                  let r = t[n.h] || {};
                  for (let t = 0; t < e.requestHeaders.length; ++t)
                    (e.requestHeaders[t].name.toLowerCase() === n.p &&
                      (r[n.p] = e.requestHeaders[t].value),
                      e.requestHeaders[t].name.toLowerCase() === n.$ &&
                        (r[n.$] = e.requestHeaders[t].value),
                      e.requestHeaders[t].name.toLowerCase() === n.T &&
                        (r[n.T] = e.requestHeaders[t].value));
                  const i = {};
                  ((i[n.h] = r), chrome.storage.local.set(i));
                });
            }
            static le(e) {
              const t =
                e.requestBody && e.requestBody.formData
                  ? e.requestBody.formData
                  : null;
              if (!t || !t.doc_id || !t.fb_api_req_friendly_name) return;
              const r = t.doc_id[0],
                n = t.fb_api_req_friendly_name[0];
              r &&
                n &&
                chrome.storage.local.get("instaDocIds", function (e) {
                  let t = (e && e.instaDocIds) || {};
                  t[n] !== r &&
                    ((t[n] = r), chrome.storage.local.set({ instaDocIds: t }));
                });
            }
            static async P() {
              return new Promise(function (e, t) {
                chrome.cookies.get(
                  { url: "https://instagram.com", name: "csrftoken" },
                  function (t) {
                    e(t.value);
                  },
                );
              });
            }
            static I() {
              return new Promise(function (t, r) {
                chrome.storage.local.get(n.h, function (i) {
                  const h = (i && i[n.h]) || {};
                  const headers = {
                    [n.$]: h[n.$] || n.A,
                    [n.T]: h[n.T] || "219994",
                    [n.p]: h[n.p] || "0",
                  };
                  return e.P().then(function (csrf) {
                    if (!csrf) return r("no_token");
                    headers[n.U] = csrf;
                    t(headers);
                  }).catch(function() { r("no_token"); });
                });
              });
            }
          };
        })();
      },
      (e) => {
        e.exports = (function () {
          return {
            S: "",
            A: "1007089331",
            U: "x-csrftoken",
            N: 2,
            p: "x-ig-www-claim",
            R: "2efa04f61586458cef44441f474eee7c",
            h: "instaHeaders",
            $: "x-ig-app-id",
            T: "x-asbd-id",
            H: "be13233562af2d229b008d2976b998b5",
            L: "x-requested-with",
            k: "kuc",
            O: "bell",
            G: "x-instagram-ajax",
          };
        })();
      },
      (e) => {
        e.exports = (function () {
          return class e {
            static D = null;
            static C =
              "M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z";
            static M = "jpg";
            static B = "mp4";
            static F = 8;
            static J = 2;
            static j = 1;
            static V() {
              return location.pathname.replace(/\/+/, "/");
            }
            static Y(e, t) {
              return e.takenAt < t.takenAt ? 1 : e.takenAt > t.takenAt ? -1 : 0;
            }
            static X(e, t) {
              let r = e.width || e.config_width || null,
                n = t.width || t.config_width || null,
                i = e.height || e.config_height || null,
                o = t.height || t.config_height || null;
              return r && n && r !== i && n !== o
                ? r !== n
                  ? n > r
                    ? 1
                    : -1
                  : o > i
                    ? 1
                    : -1
                : 0;
            }
            static K(e) {
              if (
                document.querySelector(
                  `a[href*="${e}/followers/"], a[href*="${e}/following/"]`,
                )
              )
                return !0;
              let t = document.querySelector("main header section");
              return t && t.innerText && t.innerText.toLowerCase().includes(e);
            }
            static W() {
              let e = location.pathname.match("(?<=/).+?(?=/)|(?<=/).+?(?=/)"),
                t = (e && e[0]) || null;
              return (
                t ||
                  ((e = location.pathname.match(/\/([^/]+)\/?$/)),
                  (t = (e && e[1]) || null)),
                t
              );
            }
            static Z() {
              let e;
              return new URLSearchParams(location.href.split("?")[1]).get("q");
            }
            static ee() {
              let e = location.pathname.match(
                "(?<=/stories/).+?(?=/)|(?<=/stories/).+",
              );
              return e && e[0];
            }
            static te() {
              let e = location.pathname.match(
                "(?<=/stories/highlights/).+?(?=/)|(?<=/stories/highlights/).+",
              );
              return e && e[0];
            }
            static re() {
              return /(^\/reels\/audio\/.+\/$)/.test(location.pathname);
            }
            static ne() {
              let e = location.pathname.match(
                "(?<=/reels/).+?(?=/$)|(?<=/reel/).+?(?=/$)",
              );
              return e && e[0];
            }
            static ie() {
              let e = location.pathname.match(/\/explore\/locations\/(\d+)/);
              return e && e[1];
            }
            static oe() {
              let e = location.pathname.match(/(?<=\/p\/).+?(?=\/)/);
              return e && e[0];
            }
            static se() {
              let e = location.pathname.match(
                /(?<=\/reels\/audio\/).[^\/]+?(?=\/)/,
              );
              return e && e[0];
            }
            static ae() {
              let e = location.pathname.match(/\/([^/]+)\/?$/);
              return (e && e[1]) || null;
            }
            static le() {
              return "/explore/" === location.pathname;
            }
            static ue() {
              let e = location.pathname.match(
                "^/explore/locations/(?!.*(?:nearby|recent)/).+",
              );
              return e && e[0];
            }
            static ce() {
              let e = location.pathname.match(
                "/explore/locations/.+/[^/]+/(nearby|recent)/",
              );
              return e && e[0];
            }
            static _e() {
              let e = location.pathname.match(
                "(^/explore/tags/.+/|/explore/search/keyword/.*)",
              );
              return e && e[0];
            }
            static fe() {
              let e = location.pathname.match("^/stories/highlights/[0-9]+/$");
              return e && e[0];
            }
            static de() {
              let e = location.pathname.match(
                "^/stories/.+/[0-9]+/$|^/stories/.+/$",
              );
              return e && e[0];
            }
            static me() {
              let e = location.pathname.match(/\/reels\/audio\/*.+/);
              return e && e[0];
            }
            static he() {
              let e = location.pathname.match(
                "(/reels/.+/)|(^/reels/$)|(^/reels$)",
              );
              return e && e[0];
            }
            static ge() {
              let e = location.pathname.match("(/reels/.+/)|(/reels/.+)");
              return e && e[0];
            }
            static pe() {
              let e = location.pathname.match(/(.+\/{1}guide)|(.+\/{1}guides)/);
              return e && e[0];
            }
            static $e() {
              return "/" === location.pathname;
            }
            static we() {
              return /\?variant=past_posts/.test(location.href);
            }
            static ve() {
              function e(e, t) {
                return Math.floor(Math.random() * (1 + t - e)) + e;
              }
              return e(1, 9e9);
            }
            static xe(t) {
              let r = null,
                n = null,
                i = e.W();
              if (!i) return t(!1);
              function o() {
                (r && clearInterval(r),
                  r && (r = null),
                  n && clearTimeout(n),
                  n && (n = null));
              }
              function s() {
                return !(!i || !e.K(i) || (o(), t("explore" !== i), 0));
              }
              s() ||
                (o(),
                (r = setInterval(s, 10)),
                (n = setTimeout(function () {
                  return (o(), t(!1));
                }, 1e4)));
            }
            static ye() {
              return /\/*.+\/saved\/$/.test(location.pathname);
            }
            static Te() {
              return /\/*.+\/saved\/all-posts\/$/.test(location.pathname);
            }
            static Pe() {
              return /\/saved\/*.+\/[0-9]+\/$/.test(location.pathname);
            }
            static Ie() {
              let e = location.pathname.match("/.+/tagged/");
              return e && e[0];
            }
            static Ee() {
              let e = location.pathname.match("/.+/reels/");
              return e && e[0];
            }
            static Ue() {
              let t = e
                .V()
                .match(/(^\/p\/.+\/)|(^\/reel\/.+\/)|(^\/p\/.+)|(^\/reel\/.+)/);
              return t && t[0];
            }
            static Se(t) {
              if (e.Ue()) e.D = "post_page";
              else if (e.fe()) e.D = "highlights_page;";
              else if (e.de()) e.D = "stories_page;";
              else if (e.we()) e.D = "main_timeline_page";
              else if (e.$e()) e.D = "main_page";
              else if (e.re()) e.D = "reels_audio_page";
              else {
                if (e.he())
                  return e.Ae(function (r) {
                    return ((e.D = r ? "reels_feed_page" : null), t(e.D));
                  });
                if (e.ce()) e.D = "explorer_page";
                else if (e.ue()) e.D = "explorer_location_page";
                else if (e._e()) e.D = "explorer_page";
                else if (e.le()) e.D = "explorer_page";
                else if (e.ye()) e.D = "user_saved_preview_page";
                else if (e.Te()) e.D = "user_saved_page";
                else if (e.Pe()) e.D = "user_saved_collection_page";
                else if (e.Ie()) e.D = "user_tag_page";
                else if (e.Ee()) e.D = "user_reels_page";
                else {
                  if (!e.pe())
                    return e.xe(function (r) {
                      return ((e.D = r ? "user_feed_page" : null), t(e.D));
                    });
                  e.D = "guide_page";
                }
              }
              return t(e.D);
            }
            static Ae(t) {
              let r = null,
                n = setInterval(function () {
                  if (e.ge() || document.querySelector("video"))
                    return (
                      clearInterval(n),
                      (n = null),
                      r && clearTimeout(r),
                      (r = null),
                      t(!0)
                    );
                }, 50);
              r = setTimeout(function () {
                return (clearInterval(n), (n = null), t(!1));
              }, 5e3);
            }
            static Ne() {
              return new Promise(function (e, t) {
                chrome.runtime.sendMessage(
                  { title: "get_download_status" },
                  function (t) {
                    e(t);
                  },
                );
              });
            }
            static qe() {
              return new Promise(function (t, r) {
                let n = new Date();
                n.setMonth(n.getMonth() - 1);
                let i = n.getTime() / 1e3;
                chrome.storage.local.get("inputDate", function (r) {
                  if (!r || !r.inputDate || !e.D) return t(i);
                  if (e.D && e.D.includes("user")) {
                    let n = e.W();
                    if (n && e.K(n)) {
                      let o = n + "_" + e.D;
                      return r.inputDate[o] ? t(r.inputDate[o]) : t(i);
                    }
                  }
                  return t(i);
                });
              });
            }
            static Re(e) {
              e.length > 28 && (e = e.substr(0, e.length - 28));
              const t = "abcdefghijklmnopqrstuvwxyz",
                r = t.toUpperCase() + t + "0123456789-_";
              let n = BigInt(0);
              for (let t of e) {
                let e = r.indexOf(t);
                ((n *= BigInt(64)), (n += BigInt(e)));
              }
              return n.toString();
            }
            static be = "dark";
            static He = "ok";
            static Le = "stop";
            static ke = "skip";
            static Oe() {
              let t = localStorage.getItem("igt");
              return t && t === e.be;
            }
            static Ge() {
              let e =
                document.querySelector(`svg path[d*="${this.C}"]`) || null;
              if (!e) return;
              let t = (e && e.closest("button")) || null;
              t ? t.click() : e.parentElement.parentElement.click();
            }
            static De(e) {
              return !e.closest("[hidden]");
            }
            static Ce() {
              const e = Array.from(document.querySelectorAll("section")).find(
                (e) => !e.closest("[hidden]"),
              );
              return Array.from(e.querySelectorAll("div")).find((e) => {
                let t = e.clientHeight || e.offsetHeight;
                if (t > 0 && t < 6) return e.parentElement;
              });
            }
            static Me(t, r) {
              return {
                username: r._userName,
                id: t.id || t.pk || e.ve(),
                url: r.url,
                fileExt: r.fileExt,
                takenAt: r.takenAt,
                collectionName: r._collectionName || r.collectionName || null,
                shortcode: r.shortcode || r.code || r.id || r.pk || null,
                y: r.creationTime.getFullYear().toString(),
                m: (r.creationTime.getMonth() + 1).toString().padStart(2, "0"),
                d: r.creationTime.getDate().toString().padStart(2, "0"),
                time: r.creationTime
                  .toTimeString()
                  .slice(0, 8)
                  .replace(/:/g, ""),
                tm: new Date().getTime().toString(),
                dm: r.creationTime.toISOString().split("T")[0],
                q: `${r.width}x${r.height}`,
                desc: (t.caption && t.caption.text) || "",
                lc: t.like_count || null,
                pc: t.play_count || null,
                cc: t.comment_count || null,
                pt: r.pageType,
                loc:
                  (t.location && t.location.name) ||
                  (t.location && t.location.short_name) ||
                  (t.location && t.location.city) ||
                  "",
                index: r.index || null,
                prefix: chrome.i18n.getMessage("massPrefix"),
                isThumb: r.isThumb || !1,
              };
            }
          };
        })();
      },
      (e) => {
        e.exports = (function () {
          return function e(t, r = !1) {
            function n(e) {
              return new Promise(function (t, r) {
                let n = "isDownload";
                chrome.tabs.sendMessage(e, { message: n }, function (e) {
                  e && e.isDownload ? t() : r();
                });
              });
            }
            chrome.tabs.query({ url: ["*://*.instagram.com/*"] }, function (e) {
              let r = [];
              for (let t of e) r.push(n(t.id));
              return (
                Promise.any(r)
                  .then(function () {
                    t(!0);
                  })
                  .catch(function () {
                    t(!1);
                  }),
                !0
              );
            });
          };
        })();
      },
    ],
    t = {};
  function r(n) {
    var i = t[n];
    if (void 0 !== i) return i.exports;
    var o = (t[n] = { exports: {} });
    return (e[n](o, o.exports, r), o.exports);
  }
  ((() => {
    r.n = (e) => {
      var t = e && e.__esModule ? () => e.default : () => e;
      return (r.d(t, { a: t }), t);
    };
  })(),
    (() => {
      r.d = (e, t) => {
        for (var n in t)
          r.o(t, n) &&
            !r.o(e, n) &&
            Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
      };
    })(),
    (() => {
      r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
    })(),
    (() => {
      var e = r(1),
        t = r.n(e),
        n = r(2),
        i = r.n(n),
        o = r(3),
        s = r.n(o),
        a = r(4),
        l = r.n(a);
      class u {
        static failedInSequenceCount = 0;
        static Be(e, r) {
          e.postId
            ? i()
                .I()
                .then(function (n) {
                  let i = { method: "GET", headers: n },
                    o =
                      "https://i.instagram.com/api/v1/media/" +
                      e.postId +
                      "/info/";
                  t().i(
                    o,
                    i,
                    function (e) {
                      return !e || (e && e.err)
                        ? r({ err: !0 })
                        : e.items && e.items.length
                          ? void r(e.items)
                          : r({ err: !0 });
                    },
                    !1,
                  );
                })
                .catch(function (e) {
                  r({ err: e });
                })
            : r({ err: "no_post_id" });
        }
        static Fe(e, r) {
          e.searchId && e.type
            ? i()
                .I()
                .then(function (n) {
                  let i = { method: "GET", headers: n },
                    o = "";
                  "tags" === e.type
                    ? (o = encodeURIComponent(`tag_name=${e.searchId}`))
                    : "locations" === e.type &&
                      (o = encodeURIComponent(`location_id=${e.searchId}`));
                  let s = `https://i.instagram.com/api/v1/${e.type}/web_info/?${o}`;
                  t().t(s, i, function (e) {
                    if (!e || (e && e.err)) return r({ err: !0 });
                    let t = e.data || e.native_location_data || null;
                    if (!t) return r({ err: !0 });
                    let n = null,
                      i = null,
                      o = [];
                    t.recent &&
                      t.recent.more_available &&
                      ((n = (t.recent && t.recent.next_max_id) || null),
                      (i = t.recent.next_page || null));
                    let s =
                      (t.top && t.top.sections) ||
                      (t.ranked && t.ranked.sections) ||
                      null;
                    (s && (o = o.concat(s)),
                      t.recent &&
                        t.recent.sections &&
                        (o = o.concat(t.recent.sections)));
                    let a = [];
                    for (let e of o)
                      if (
                        "media" === e.feed_type &&
                        e.layout_content &&
                        e.layout_content.medias &&
                        e.layout_content.medias.length
                      )
                        for (let t of e.layout_content.medias)
                          t.media && a.push(t.media);
                    r({ infoToDownload: a, maxId: n, pageNum: i });
                  });
                })
                .catch(function (e) {
                  r({ err: e });
                })
            : r({ err: "no_info_for_req" });
        }
        static Qe(e, r) {
          if (!e.searchId || !e.maxId || null === e.pageNum || !e.type)
            return r({ err: "no_scroll_info" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              ((i.headers[s().G] = s().A),
                (i.headers[s().L] = "XMLHttpRequest"),
                (i.body = new URLSearchParams({
                  include_persistent: 0,
                  max_id: e.maxId,
                  page: e.pageNum,
                  surface: "grid",
                  tab: "recent",
                })));
              let o = `https://i.instagram.com/api/v1/${e.type}/${e.searchId}/sections/`;
              t().i(o, i, function (e) {
                if (!e || (e && e.err)) return r({ err: !0 });
                if (!e.sections) return r({ err: !0 });
                let t = null,
                  n = null;
                e.more_available &&
                  ((t = e.next_max_id || null), (n = e.next_page || null));
                let i = [];
                for (let t of e.sections)
                  if (
                    "media" === t.feed_type &&
                    t.layout_content &&
                    t.layout_content.medias &&
                    t.layout_content.medias.length
                  )
                    for (let e of t.layout_content.medias)
                      e.media && i.push(e.media);
                r({ feedInfo: i, maxId: t, nextPage: n });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Je(e, r) {
          return e.pk
            ? u.failedInSequenceCount > 3
              ? r({ err: !0 })
              : void i()
                  .I()
                  .then(function (n) {
                    let i = { method: "GET", headers: n };
                    chrome.storage.local.get("instaQueryHash", function (n) {
                      const o = `https://www.instagram.com/api/v1/media/${e.pk}/info/`;
                      function a(t) {
                        if (t.err || !t.items) return { err: !0 };
                        let r = (t.items && t.items[0]) || null;
                        if (!r) return { err: !0 };
                        let n = [],
                          i = r && r.owner && r.owner.username;
                        i || (i = l().ve());
                        let o = e.collectionName || null,
                          s = r.taken_at || r.taken_at_timestamp || null,
                          a = s && new Date(1e3 * parseInt(s));
                        if (r.carousel_media) {
                          let t = 0;
                          r.carousel_media.forEach(function (u) {
                            if ((t++, u.video_versions)) {
                              let c = u.video_versions.sort(l().X);
                              c = c && c[0];
                              let _ = l().Me(r, {
                                _userName: i,
                                url: c.src || c.url,
                                width: c.width,
                                height: c.height,
                                fileExt: l().B,
                                takenAt: s,
                                pageType: e.pageType,
                                creationTime: a,
                                index: t,
                                collectionName: o,
                              });
                              if ((n.push(_), e.toDwThumb)) {
                                let c = u.image_versions2.candidates.sort(
                                    l().X,
                                  ),
                                  _ = l().Me(r, {
                                    _userName: i,
                                    url: c[0].src || c[0].url,
                                    width: c[0].width,
                                    height: c[0].height,
                                    fileExt: l().M,
                                    takenAt: s,
                                    pageType: e.pageType,
                                    creationTime: a,
                                    index: t,
                                    collectionName: o,
                                    isThumb: !0,
                                  });
                                n.push(_);
                              }
                            } else if (
                              u.image_versions2 &&
                              u.image_versions2.candidates
                            ) {
                              let c = u.image_versions2.candidates.sort(l().X),
                                _ = l().Me(r, {
                                  _userName: i,
                                  url: c[0].src || c[0].url,
                                  width: c[0].width,
                                  height: c[0].height,
                                  fileExt: l().M,
                                  takenAt: s,
                                  pageType: e.pageType,
                                  collectionName: o,
                                  creationTime: a,
                                  index: t,
                                });
                              n.push(_);
                            }
                          });
                        } else if (r.video_versions) {
                          let t = r.video_versions.sort(l().X);
                          t = t && t[0];
                          let u = l().Me(r, {
                            _userName: i,
                            url: t.src || t.url,
                            width: t.width,
                            height: t.height,
                            pageType: e.pageType,
                            fileExt: l().B,
                            collectionName: o,
                            takenAt: s,
                            creationTime: a,
                          });
                          if ((n.push(u), e.toDwThumb)) {
                            let t = r.image_versions2.candidates.sort(l().X),
                              u = l().Me(r, {
                                _userName: i,
                                url: t[0].src || t[0].url,
                                width: t[0].width,
                                height: t[0].height,
                                fileExt: l().M,
                                collectionName: o,
                                takenAt: s,
                                pageType: e.pageType,
                                creationTime: a,
                                isThumb: !0,
                              });
                            n.push(u);
                          }
                        } else {
                          if (
                            !r.image_versions2 ||
                            !r.image_versions2.candidates
                          )
                            return { err: !0 };
                          {
                            let t = r.image_versions2.candidates.sort(l().X),
                              u = l().Me(r, {
                                _userName: i,
                                url: t[0].src || t[0].url,
                                width: t[0].width,
                                height: t[0].height,
                                collectionName: o,
                                fileExt: l().M,
                                takenAt: s,
                                pageType: e.pageType,
                                creationTime: a,
                              });
                            n.push(u);
                          }
                        }
                        return n;
                      }
                      t().i(
                        o,
                        i,
                        function (t) {
                          if (t.err)
                            queryHash !== s().R
                              ? (delete n.instaQueryHash.forSinglePost,
                                chrome.storage.local.set(
                                  { instaQueryHash: n.instaQueryHash },
                                  function () {
                                    u.Je(e, r);
                                  },
                                ))
                              : (u.failedInSequenceCount++,
                                r({ err: "empty_response" }));
                          else {
                            u.failedInSequenceCount = 0;
                            let e = a(t);
                            r(e);
                          }
                        },
                        !1,
                      );
                    });
                  })
                  .catch(function (e) {
                    r({ err: e });
                  })
            : r({ err: "empty_pk" });
        }
        static je(e, r) {
          if (!e.userId) return r({ err: "no_userId" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "POST", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o = `target_user_id=${e.userId}&page_size=12&include_feed_video=true`;
              (e.maxId && (o += "&max_id=" + e.maxId), (i.body = o));
              let s = "https://i.instagram.com/api/v1/clips/user/";
              t().i(s, i, function (e) {
                if (!e || (e && e.err)) return r({ err: !0 });
                if (!e.items) return r({ err: !0 });
                let t = null,
                  n = !1;
                (e.paging_info &&
                  void 0 !== e.paging_info.max_id &&
                  (t = e.paging_info.max_id),
                  e.paging_info &&
                    void 0 !== e.paging_info.more_available &&
                    (n = e.paging_info.more_available),
                  r({ maxId: t, hasNextPage: n, feedInfo: e.items }));
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Ve(e, r) {
          if (!e.audioId) return r({ err: "no_audio_id" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "POST", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o = {
                audio_cluster_id: e.audioId,
                original_sound_audio_asset_id: e.audioId,
              };
              (e.maxId && (o.max_id = e.maxId),
                (i.body = new URLSearchParams(o).toString()));
              let s = "https://i.instagram.com/api/v1/clips/music/";
              t().i(s, i, function (e) {
                if (!e || (e && e.err)) return r({ err: !0 });
                let t = (e.paging_info && e.paging_info.max_id) || null,
                  n = (e.paging_info && e.paging_info.more_available) || null,
                  i = (e.media_count && e.media_count.clips_count) || null,
                  o = e.items || null;
                r({ maxId: t, hasNextPage: n, feedCnt: i, feedInfo: o });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
      }
      class c {
        static ze(e, r) {
          if (!e.userId) return r({ err: "empty_user_id" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              ((i.headers["content-type"] =
                "application/x-www-form-urlencoded"),
                chrome.storage.local.get("instaQueryHash", function (n) {
                  let o = null;
                  if (
                    n &&
                    n.instaQueryHash &&
                    n.instaQueryHash.forHighlightsListId
                  )
                    o = `https://www.instagram.com/graphql/query/?query_id=${n.instaQueryHash.forHighlightsListId}&user_id=${e.userId}&include_chaining=false&include_reel=true&include_suggested_users=false&include_logged_out_extras=false&include_live_status=false&include_highlight_reels=true"`;
                  else {
                    if (
                      !n ||
                      !n.instaQueryHash ||
                      !n.instaQueryHash.forHighlightsList
                    )
                      return r({ err: "no_queryhash" });
                    let t;
                    o =
                      "https://www.instagram.com/graphql/query/?query_hash=" +
                      n.instaQueryHash.forHighlightsList +
                      "&variables=" +
                      encodeURIComponent(
                        JSON.stringify({
                          user_id: e.userId,
                          include_chaining: !0,
                          include_reel: !0,
                          include_suggested_users: !1,
                          include_logged_out_extras: !1,
                          include_highlight_reels: !0,
                          include_live_status: !0,
                        }),
                      );
                  }
                  if (!o) return r({ err: "no_url" });
                  t().t(o, i, function (e) {
                    if (
                      !(
                        e &&
                        e.data &&
                        e.data.user &&
                        e.data.user.edge_highlight_reels &&
                        e.data.user.edge_highlight_reels.edges &&
                        e.data.user.edge_highlight_reels.edges.length
                      )
                    )
                      return r({ err: !0 });
                    let t = [];
                    for (let r of e.data.user.edge_highlight_reels.edges)
                      r.node && r.node.id && t.push(r.node.id);
                    r(t);
                  });
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Ye(e, r) {
          if (!e.highlightId) return r({ err: "empty_highlight_id" });
          i()
            .I()
            .then(function (n) {
              let i = {
                method: "GET",
                headers: n,
                credentials: "include",
              };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              chrome.storage.local.get("instaDocIds", function (s) {
                let a = (s && s.instaDocIds) || {},
                  d =
                    a["PolarisStoriesV3HighlightsPageQuery"] ||
                    "28325328583775973",
                  o =
                    "https://www.instagram.com/graphql/query/?doc_id=" +
                    d +
                    "&variables=" +
                    encodeURIComponent(
                      JSON.stringify({
                        initial_reel_id: "highlight:" + e.highlightId,
                        reel_ids: ["highlight:" + e.highlightId],
                        first: 3,
                        last: 2,
                        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider:
                          !0,
                      }),
                    );
                t().t(o, i, function (t) {
                  const u =
                    t &&
                    t.data &&
                    t.data["xdt_api__v1__feed__reels_media__connection"] &&
                    t.data["xdt_api__v1__feed__reels_media__connection"].edges;
                  if (!u || !u.length || !u[0].node) return r({ err: !0 });
                  const c = u[0].node;
                  if (!c.items || !c.items.length) return r({ err: !0 });
                  let n = [],
                    h =
                      ((c.user && c.user.username) || l().ve()) +
                      "_" +
                      (c.title || c.reel_title || ""),
                    p = (c.user && c.user.pk) || null;
                  for (let t of c.items) {
                    if (!t.media_type) continue;
                    let e, o;
                    if (t.media_type === l().J) {
                      let n = t.video_versions.sort(l().X);
                      ((e = n[0].src || n[0].url), (o = l().B));
                    } else {
                      if (t.media_type !== l().j) continue;
                      {
                        let n = t.image_versions2.candidates.sort(l().X);
                        ((e = n[0].src || n[0].url), (o = l().M));
                      }
                    }
                    n.push({
                      userName: h,
                      fileExt: o,
                      url: e,
                      id: t.id || t.pk || l().ve(),
                      userPk: p,
                    });
                  }
                  r(n);
                });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Xe(e, r) {
          if (!e.userId) return r({ err: "empty_user_id" });
          i()
            .I()
            .then(function (n) {
              let i = {
                method: "GET",
                headers: n,
                credentials: "include",
              };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              chrome.storage.local.get("instaDocIds", function (s) {
                let a = (s && s.instaDocIds) || {},
                  d =
                    a["PolarisStoriesV3ReelPageGalleryQuery"] ||
                    "28262315486766731",
                  o =
                    "https://www.instagram.com/graphql/query/?doc_id=" +
                    d +
                    "&variables=" +
                    encodeURIComponent(
                      JSON.stringify({
                        initial_reel_id: e.userId,
                        reel_ids: [e.userId],
                        first: 3,
                        last: 2,
                        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider:
                          !0,
                      }),
                    );
                t().t(o, i, function (t) {
                  let n = [];
                  const u =
                    t &&
                    t.data &&
                    t.data["xdt_api__v1__feed__reels_media__connection"] &&
                    t.data["xdt_api__v1__feed__reels_media__connection"].edges;
                  if (!u || !u.length || !u[0].node) return r({ err: !0 });
                  const c = u[0].node;
                  if (c.err || !c.items || !c.items.length)
                    return r({ showErr: !0 });
                  const h = (c.user && c.user.username) || "";
                  for (let m = 0; m < c.items.length; ++m) {
                    const w = c.items[m];
                    if (!w.taken_at || !w.media_type) continue;
                    let s = w.taken_at || null,
                      a = s && new Date(1e3 * parseInt(s)),
                      o = {};
                    if (w.media_type === l().J) {
                      let t = w.video_versions.sort(l().X);
                      o = l().Me(w, {
                        _userName: h,
                        url: t[0].src || t[0].url,
                        width: t[0].width,
                        height: t[0].height,
                        pageType: e.pageType,
                        fileExt: l().B,
                        takenAt: s,
                        creationTime: a,
                      });
                    } else {
                      if (w.media_type !== l().j) continue;
                      {
                        let t = w.image_versions2.candidates.sort(l().X);
                        o = l().Me(w, {
                          _userName: h,
                          url: t[0].src || t[0].url,
                          width: t[0].width,
                          height: t[0].height,
                          pageType: e.pageType,
                          fileExt: l().M,
                          takenAt: s,
                          creationTime: a,
                        });
                      }
                    }
                    n.push(o);
                  }
                  r(n);
                });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Ke(e) {
          i()
            .I()
            .then(function (r) {
              let n = { method: "GET", headers: r };
              n.headers["content-type"] = "application/x-www-form-urlencoded";
              let i = "https://i.instagram.com/api/v1/feed/reels_tray/";
              t().t(i, n, e);
            })
            .catch(function (t) {
              e({ err: t });
            });
        }
      }
      class _ {
        static We(e, r) {
          if (!e.userId) return r({ err: "no_post_id" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "POST", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o = {
                target_user_id: e.userId,
                page_size: 12,
                include_feed_video: !0,
              };
              (e.maxId && (o.max_id = e.maxId),
                (i.body = new URLSearchParams(o).toString()));
              let s = "https://i.instagram.com/api/v1/clips/user/";
              t().i(s, i, r);
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static Ze(e, r) {
          if (!e.userName) return r({ err: "empty_userName" });
          i()
            .I()
            .then(function (n) {
              let i = {
                method: "GET",
                headers: n,
                credentials: "include",
              };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              chrome.storage.local.get("instaDocIds", function (s) {
                let a = (s && s.instaDocIds) || {},
                  d =
                    a["PolarisSearchBoxRefetchableQuery"] ||
                    "27706427925724183",
                  o =
                    "https://www.instagram.com/graphql/query/?doc_id=" +
                    d +
                    "&variables=" +
                    encodeURIComponent(
                      JSON.stringify({
                        data: {
                          context: "blended",
                          include_reel: "true",
                          query: e.userName,
                          rank_token: "",
                          search_surface: "web_top_search",
                        },
                        hasQuery: !0,
                      }),
                    );
                t().t(o, i, function (t) {
                  try {
                    const u =
                      t &&
                      t.data &&
                      t.data["xdt_api__v1__fbsearch__topsearch_connection"] &&
                      t.data["xdt_api__v1__fbsearch__topsearch_connection"]
                        .users;
                    if (!u || !u.length) return r({ err: "no_user_id" });
                    const c =
                      u.find(
                        (t) =>
                          t.user &&
                          t.user.username &&
                          t.user.username.toLowerCase() ===
                            e.userName.toLowerCase(),
                      ) || u[0];
                    const h = c && c.user && c.user.id;
                    r(h ? { userId: String(h) } : { err: "no_user_id" });
                  } catch (e) {
                    r({ err: "no_user_id" });
                  }
                });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static tt(e, r) {
          if (!e.userName) return r({ err: !0 });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o =
                "https://i.instagram.com/api/v1/users/web_profile_info/?username=" +
                e.userName;
              t().t(o, i, function (t) {
                return t.err
                  ? r({ err: !0 })
                  : e.rawData && t.data && t.data.user
                    ? r({ userInfo: t.data.user })
                    : t.data &&
                        t.data.user &&
                        t.data.user.id &&
                        t.data.user.edge_owner_to_timeline_media &&
                        t.data.user.edge_owner_to_timeline_media.page_info
                      ? void 0 ===
                          t.data.user.edge_owner_to_timeline_media.page_info
                            .end_cursor ||
                        void 0 ===
                          t.data.user.edge_owner_to_timeline_media.page_info
                            .has_next_page
                        ? r({ err: !0 })
                        : void r({
                            endCursor:
                              t.data.user.edge_owner_to_timeline_media.page_info
                                .end_cursor,
                            hasNextPage:
                              t.data.user.edge_owner_to_timeline_media.page_info
                                .has_next_page,
                            userId: t.data.user.id,
                            userName: t.data.user.username,
                            postsAmount:
                              t.data.user.edge_owner_to_timeline_media.count,
                            postsFeedInfo:
                              t.data.user.edge_owner_to_timeline_media.edges,
                          })
                      : r({ err: !0 });
              });
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static rt(e, r) {
          if (!e.endCursor || !e.userId) return r({ err: "no_end_cursor" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              ((i.headers["content-type"] =
                "application/x-www-form-urlencoded"),
                chrome.storage.local.get("instaQueryHash", function (n) {
                  if (!n.instaQueryHash || !n.instaQueryHash.forUserSavedPosts)
                    return r({ err: "no_query_hash" });
                  let o,
                    s =
                      "https://www.instagram.com/graphql/query/?query_hash=" +
                      n.instaQueryHash.forUserSavedPosts +
                      "&variables=" +
                      encodeURIComponent(
                        JSON.stringify({
                          id: e.userId,
                          first: "12",
                          after: e.endCursor,
                        }),
                      );
                  t().i(s, i, r);
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static nt(e, r) {
          i()
            .I()
            .then(function (e) {
              let n = {
                  collection_types: JSON.stringify([
                    "ALL_MEDIA_AUTO_COLLECTION",
                    "MEDIA",
                  ]),
                  include_public_only: 0,
                },
                i = `https://www.instagram.com/api/v1/collections/list/?${new URLSearchParams(n)}`,
                o = { method: "GET", headers: e };
              ((o.headers["content-type"] =
                "application/x-www-form-urlencoded"),
                t().t(i, o, function (e) {
                  if (!e || (e && e.err)) return r({ err: !0 });
                  if (!e.items) return r({ err: !0 });
                  let t = [];
                  (e.items.forEach(function (e) {
                    t.push({
                      collection_id: e.collection_id,
                      collection_name: e.collection_name,
                      feed_posts_count: e.collection_media_count,
                    });
                  }),
                    r(t));
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static it(e, r) {
          if (!e.collectionId) return r({ err: "no_collection_id" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o = `https://www.instagram.com/api/v1/feed/collection/${e.collectionId}/posts/?max_id=`;
              (e.endCursor && (o += e.endCursor),
                t().i(o, i, function (e) {
                  if (!e || (e && e.err)) return r({ err: !0 });
                  if (!e.items || !Array.isArray(e.items))
                    return r({ err: !0 });
                  let t = null,
                    n = !1;
                  (e.next_max_id &&
                    void 0 !== e.next_max_id &&
                    (t = e.next_max_id),
                    t && (n = !0),
                    r({ maxId: t, hasNextPage: n, feedInfo: e.items }));
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static ot(e, r) {
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o =
                "https://www.instagram.com/api/v1/feed/saved/posts/?max_id=";
              (e.endCursor && (o += e.endCursor),
                t().i(o, i, function (e) {
                  if (!e || (e && e.err)) return r({ err: !0 });
                  if (!e.items || !Array.isArray(e.items))
                    return r({ err: !0 });
                  let t = null,
                    n = !1;
                  (e.next_max_id &&
                    void 0 !== e.next_max_id &&
                    (t = e.next_max_id),
                    t && (n = !0),
                    r({ maxId: t, hasNextPage: n, feedInfo: e.items }));
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static st(e, r) {
          if (!e.userId) return r({ err: "no_userId" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              ((i.headers["content-type"] =
                "application/x-www-form-urlencoded"),
                chrome.storage.local.get("instaQueryHash", function (n) {
                  let o =
                    (n.instaQueryHash && n.instaQueryHash.forUserTagPosts) ||
                    s().H;
                  if (!o) return r({ err: !0 });
                  let a = { id: e.userId, first: "12" };
                  e.maxId && (a.after = e.maxId);
                  let l,
                    u =
                      "https://www.instagram.com/graphql/query/?query_hash=" +
                      o +
                      "&variables=" +
                      encodeURIComponent(JSON.stringify(a));
                  t().i(u, i, function (e) {
                    if (!e || (e && e.err)) return r({ err: !0 });
                    if (
                      !(
                        e.data &&
                        e.data.user &&
                        e.data.user.edge_user_to_photos_of_you &&
                        e.data.user.edge_user_to_photos_of_you.edges
                      )
                    )
                      return r({ err: !0 });
                    let t = null,
                      n = !1;
                    (e.data.user.edge_user_to_photos_of_you.page_info &&
                      void 0 !==
                        e.data.user.edge_user_to_photos_of_you.page_info
                          .end_cursor &&
                      (t =
                        e.data.user.edge_user_to_photos_of_you.page_info
                          .end_cursor),
                      e.data.user.edge_user_to_photos_of_you.page_info &&
                        void 0 !==
                          e.data.user.edge_user_to_photos_of_you.page_info
                            .has_next_page &&
                        (n =
                          e.data.user.edge_user_to_photos_of_you.page_info
                            .has_next_page),
                      r({
                        maxId: t,
                        hasNextPage: n,
                        feedInfo: e.data.user.edge_user_to_photos_of_you.edges,
                      }));
                  });
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static lt(e, r) {
          if (!e.userId) return r({ err: "no_userid" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              ((i.headers["content-type"] =
                "application/x-www-form-urlencoded"),
                chrome.storage.local.get("instaQueryHash", function (n) {
                  if (!n.instaQueryHash || !n.instaQueryHash.forUserAllPosts)
                    return r({ err: !0 });
                  let o,
                    s =
                      "https://www.instagram.com/graphql/query/?query_hash=" +
                      n.instaQueryHash.forUserAllPosts +
                      "&variables=" +
                      encodeURIComponent(
                        JSON.stringify({
                          id: e.userId,
                          first: "12",
                          after: e.endCursor,
                        }),
                      );
                  t().i(s, i, function (e) {
                    if (!e || (e && e.err)) return r({ err: !0 });
                    if (
                      !(
                        e.data &&
                        e.data.user &&
                        e.data.user.edge_owner_to_timeline_media &&
                        e.data.user.edge_owner_to_timeline_media.edges &&
                        e.data.user.edge_owner_to_timeline_media.page_info
                      )
                    )
                      return r({ err: !0 });
                    let t = null,
                      n = !1;
                    (void 0 !==
                      e.data.user.edge_owner_to_timeline_media.page_info
                        .end_cursor &&
                      (t =
                        e.data.user.edge_owner_to_timeline_media.page_info
                          .end_cursor),
                      void 0 !==
                        e.data.user.edge_owner_to_timeline_media.page_info
                          .has_next_page &&
                        (n =
                          e.data.user.edge_owner_to_timeline_media.page_info
                            .has_next_page),
                      r({
                        maxId: t,
                        hasNextPage: n,
                        feedInfo:
                          e.data.user.edge_owner_to_timeline_media.edges,
                      }));
                  });
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
        static ut(e, r) {
          if (!e.userName) return r({ err: "no_username" });
          i()
            .I()
            .then(function (n) {
              let i = { method: "GET", headers: n };
              i.headers["content-type"] = "application/x-www-form-urlencoded";
              let o =
                "https://i.instagram.com/api/v1/feed/user/" +
                e.userName +
                "/username/?count=12";
              (e.endCursor && (o += "&max_id=" + e.endCursor),
                t().i(o, i, function (e) {
                  if (!e || (e && e.err)) return r({ tryUserPost: !0 });
                  let t = null,
                    n = !1,
                    i;
                  if (!e.items) return r({ tryUserPost: !0 });
                  (void 0 !== e.more_available && (n = e.more_available),
                    void 0 !== e.next_max_id && (t = e.next_max_id),
                    (i = e.items),
                    r({ maxId: t, hasNextPage: n, feedInfo: i }));
                }));
            })
            .catch(function (e) {
              r({ err: e });
            });
        }
      }
      var f = r(5),
        d = r.n(f);
      class m {
        static ct() {
          let e = {
              urls: ["*://*.instagram.com/*"],
              types: ["xmlhttprequest"],
            },
            t = { urls: ["*://*.instagram.com/graphql/query/*"] },
            r = ["requestHeaders", "extraHeaders"];
          (chrome.webRequest.onBeforeSendHeaders.addListener(i()._, e, r),
            chrome.webRequest.onBeforeSendHeaders.addListener(i().l, t, r),
            chrome.webRequest.onBeforeRequest.addListener(i().le, t, [
              "requestBody",
            ]));
        }
        static _t() {
          let e = null;
          chrome.runtime.onMessage.addListener(function (t, r, n) {
            if (t)
              return "get_download_status" === t.title
                ? (d()(n), !0)
                : "get_reels_audio" === t.title
                  ? (u.Ve(t, n), !0)
                  : "get_user_stories" === t.title
                    ? (c.Xe(t, n), !0)
                    : "get_user_highlight" === t.title
                      ? (c.Ye(t, n), !0)
                      : "get_user_highlights_list" === t.title
                        ? (c.ze(t, n), !0)
                        : "get_reels_tray_info" === t.title
                          ? (c.Ke(n), !0)
                          : "get_post_info" === t.title
                            ? (u.Be(t, n), !0)
                            : "get_user_reels" === t.title
                              ? (_.We(t, n), !0)
                              : "get_user_id" === t.title
                                ? (_.Ze(t, n), !0)
                                : "get_user_info" === t.title
                                  ? (_.tt(t, n), !0)
                                  : "get_user_saved_posts_base_info" === t.title
                                    ? (_.et(t, n), !0)
                                    : "get_user_saved_collection_posts" ===
                                        t.title
                                      ? (_.it(t, n), !0)
                                      : "get_user_saved_collection_base_info" ===
                                          t.title
                                        ? (_.nt(t, n), !0)
                                        : "get_user_saved_posts" === t.title
                                          ? (_.rt(t, n), !0)
                                          : "get_user_saved_posts_alt" ===
                                              t.title
                                            ? (_.ot(t, n), !0)
                                            : "get_user_tag_posts" === t.title
                                              ? (_.st(t, n), !0)
                                              : "get_reels_posts" === t.title
                                                ? (u.je(t, n), !0)
                                                : "get_explorer_basic_by_type" ===
                                                    t.title
                                                  ? (u.Fe(t, n), !0)
                                                  : "get_explorer_scroll_by_type" ===
                                                      t.title
                                                    ? (u.Qe(t, n), !0)
                                                    : "get_user_posts" ===
                                                        t.title
                                                      ? (_.lt(t, n), !0)
                                                      : "get_user_posts_alt" ===
                                                          t.title
                                                        ? (_.ut(t, n), !0)
                                                        : "get_media_from_post" ===
                                                            t.title
                                                          ? (u.Je(t, n), !0)
                                                          : "get_download_status_scroll" ===
                                                              t.title
                                                            ? (e &&
                                                                clearInterval(
                                                                  e,
                                                                ) &&
                                                                (e = null),
                                                              (e = setInterval(
                                                                function () {
                                                                  d()(n, !0);
                                                                },
                                                                21e3,
                                                              )),
                                                              !0)
                                                            : void 0;
            n(null);
          });
        }
      }
      const h = {
          ft: function (e, t) {
            return this.dt(e, t).then((e) => {
              const t = e.headers.get("Content-Type");
              if (t && t.includes("json")) return e.json();
            });
          },
          dt: function (e, t) {
            const r = void 0;
            return fetch(e, {
              body: t,
              credentials: "include",
              method: "POST",
            });
          },
        },
        g = function (e) {
          return (
            (e = e.toString()),
            chrome.storage.local.get(e).then(function (t) {
              return t[e];
            })
          );
        },
        p = function () {
          let e = {};
          return (
            1 === arguments.length
              ? (e = arguments[0])
              : 2 === arguments.length && (e[arguments[0]] = arguments[1]),
            chrome.storage.sync.set(e)
          );
        },
        $ = function () {
          let e = {};
          return (
            1 === arguments.length
              ? (e = arguments[0])
              : 2 === arguments.length && (e[arguments[0]] = arguments[1]),
            chrome.storage.local.set(e)
          );
        },
        w = function (e) {
          return (
            (e = e.toString()),
            chrome.storage.sync.get(e).then(function (t) {
              return t[e];
            })
          );
        };
      let v = function (e) {
          return y() < e;
        },
        x = function (e) {
          return y().toString().replace(/[0.]/g, "").slice(0, e);
        },
        y = function () {
          return Math.random();
        };
      function T(e, t) {
        return (
          (e = Math.ceil(e)),
          (t = Math.floor(t)),
          Math.floor(y() * (t - e + 1)) + e
        );
      }
      let P = function () {
        return String.fromCharCode(T(65, 90)).toLowerCase();
      };
      const I = {
          ht(e, t, r) {
            const n = "";
            let i;
            const o = x(t);
            let s = n;
            return (
              `${o}${e * o}${x(t)}`.split(n).forEach(function (e) {
                let t = 0.7;
                for (; v(t); ) ((s = s.concat(P())), (t -= 0.1));
                s = s.concat(e);
              }),
              s
            );
          },
        },
        E = function (e) {
          const t = 10,
            r = 4,
            n = e.toString().substring(4, t);
          return I.ht(n, s().N);
        };
      function U(e) {
        let t = e.toString().substring(1, 6);
        return I.ht(t, s().N);
      }
      const S = function (e) {
        return w("u").then(
          (t) => (t || ((t = U(e || Date.now())), p("u", t)), t),
        );
      };
      function A(e, t, r) {
        return !e || e + 36e5 * t < r;
      }
      function N(e, t, r) {
        return q(e, t, r)
          .then((e) => h.ft(s().S, e))
          .then(function (e) {
            const r = Date.now(),
              n = e || {};
            return (t || (n[s().k] = r), $(n));
          })
          .then(() => !0);
      }
      function q(e, t, r) {
        let n = r || {};
        return S(e)
          .then(function (t) {
            return (
              (n.u = t),
              (n[s().O] = E(e)),
              (n.v = chrome.runtime.getManifest().version),
              n
            );
          })
          .then((e) => JSON.stringify(e));
      }
      const R = {
          gt(e, t) {
            let r, n;
            const i = Date.now();
            return Promise.all([g("r_delay"), g(s().k)])
              .then(function (o) {
                if ((([r, n] = o), (r = r || 6), e || A(n, r, i)))
                  return N(i, e, t);
              })
              .catch(function (e) {});
          },
        },
        b = function (e) {
          return R.gt(!1, e).catch(function (e) {});
        };
      function H() {
        b().then(() => {
          (m.ct(), m._t());
          try {
            console.log("[instavault] bg ready — story-graphql build (doc_id harvester on)");
          } catch (e) {}
        });
      }
      (chrome.runtime.onConnect.addListener(function (e) {}),
        chrome.action.onClicked.addListener(function () {
          chrome.tabs.create({ url: "https://instagram.com" });
        }),
        chrome.tabs.onUpdated.addListener(function (e, t, r) {
          if (r.url.includes("instagram") && t.url) {
            let r = t.url.match(/(?<=\/reels\/).[^\/]+(?=\/$)/);
            if (((r = (r && r[0]) || null), r))
              return chrome.tabs.sendMessage(
                e,
                { message: "reelFeedScroll", url: t.url, shortcode: r },
                function () {
                  if (chrome.runtime.lastError) return null;
                },
              );
            let n = t.url.match(/(?<=.com\/).+?(?=\/)/);
            ((n = (n && n[0]) || null),
              chrome.tabs.sendMessage(
                e,
                { message: "url", pageName: n, url: t },
                function (e) {
                  if (chrome.runtime.lastError) return null;
                },
              ));
          }
          return !0;
        }),
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
          if (message && message.action === "download" && message.payload) {
            fetch("http://localhost:19201/api/download", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(message.payload)
            })
              .then(async function (res) {
                if (!res.ok) {
                  let errText = await res.text();
                  sendResponse({ ok: false, error: errText || ("HTTP " + res.status) });
                } else {
                  let data = await res.json();
                  sendResponse({ ok: true, data: data });
                }
              })
              .catch(function (err) {
                sendResponse({ ok: false, error: (err && err.message) || "Background fetch failed" });
              });
            return true;
          }
        }),
        H());
    })());
})();

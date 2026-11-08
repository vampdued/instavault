(() => {
  var t = {
      4: (t) => {
        t.exports = (function () {
          return class t {
            static t = null;
            static i =
              "M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z";
            static u = "jpg";
            static l = "mp4";
            static h = 8;
            static v = 2;
            static p = 1;
            static _() {
              return location.pathname.replace(/\/+/, "/");
            }
            static k(t, e) {
              return t.takenAt < e.takenAt ? 1 : t.takenAt > e.takenAt ? -1 : 0;
            }
            static $(t, e) {
              let i = t.width || t.config_width || null,
                n = e.width || e.config_width || null,
                r = t.height || t.config_height || null,
                s = e.height || e.config_height || null;
              return i && n && i !== r && n !== s
                ? i !== n
                  ? n > i
                    ? 1
                    : -1
                  : s > r
                    ? 1
                    : -1
                : 0;
            }
            static T(t) {
              if (
                document.querySelector(
                  `a[href*="${t}/followers/"], a[href*="${t}/following/"]`,
                )
              )
                return !0;
              let e = document.querySelector("main header section");
              return e && e.innerText && e.innerText.toLowerCase().includes(t);
            }
            static P() {
              let t = location.pathname.match("(?<=/).+?(?=/)|(?<=/).+?(?=/)"),
                e = (t && t[0]) || null;
              return (
                e ||
                  ((t = location.pathname.match(/\/([^/]+)\/?$/)),
                  (e = (t && t[1]) || null)),
                e
              );
            }
            static I() {
              let t;
              return new URLSearchParams(location.href.split("?")[1]).get("q");
            }
            static A() {
              let t = location.pathname.match(
                "(?<=/stories/).+?(?=/)|(?<=/stories/).+",
              );
              return t && t[0];
            }
            static S() {
              let t = location.pathname.match(
                "(?<=/stories/highlights/).+?(?=/)|(?<=/stories/highlights/).+",
              );
              return t && t[0];
            }
            static N() {
              return /(^\/reels\/audio\/.+\/$)/.test(location.pathname);
            }
            static D() {
              let t = location.pathname.match(
                "(?<=/reels/).+?(?=/$)|(?<=/reel/).+?(?=/$)",
              );
              return t && t[0];
            }
            static U() {
              let t = location.pathname.match(/\/explore\/locations\/(\d+)/);
              return t && t[1];
            }
            static C() {
              let t = location.pathname.match(/(?<=\/p\/).+?(?=\/)/);
              return t && t[0];
            }
            static B() {
              let t = location.pathname.match(
                /(?<=\/reels\/audio\/).[^\/]+?(?=\/)/,
              );
              return t && t[0];
            }
            static R() {
              let t = location.pathname.match(/\/([^/]+)\/?$/);
              return (t && t[1]) || null;
            }
            static F() {
              return "/explore/" === location.pathname;
            }
            static O() {
              let t = location.pathname.match(
                "^/explore/locations/(?!.*(?:nearby|recent)/).+",
              );
              return t && t[0];
            }
            static L() {
              let t = location.pathname.match(
                "/explore/locations/.+/[^/]+/(nearby|recent)/",
              );
              return t && t[0];
            }
            static M() {
              let t = location.pathname.match(
                "(^/explore/tags/.+/|/explore/search/keyword/.*)",
              );
              return t && t[0];
            }
            static W() {
              let t = location.pathname.match("^/stories/highlights/[0-9]+/$");
              return t && t[0];
            }
            static j() {
              let t = location.pathname.match(
                "^/stories/.+/[0-9]+/$|^/stories/.+/$",
              );
              return t && t[0];
            }
            static Z() {
              let t = location.pathname.match(/\/reels\/audio\/*.+/);
              return t && t[0];
            }
            static G() {
              let t = location.pathname.match(
                "(/reels/.+/)|(^/reels/$)|(^/reels$)",
              );
              return t && t[0];
            }
            static H() {
              let t = location.pathname.match("(/reels/.+/)|(/reels/.+)");
              return t && t[0];
            }
            static K() {
              let t = location.pathname.match(/(.+\/{1}guide)|(.+\/{1}guides)/);
              return t && t[0];
            }
            static J() {
              return "/" === location.pathname;
            }
            static V() {
              return /\?variant=past_posts/.test(location.href);
            }
            static X() {
              function t(t, e) {
                return Math.floor(Math.random() * (1 + e - t)) + t;
              }
              return t(1, 9e9);
            }
            static Y(e) {
              let i = null,
                n = null,
                r = t.P();
              if (!r) return e(!1);
              function s() {
                (i && clearInterval(i),
                  i && (i = null),
                  n && clearTimeout(n),
                  n && (n = null));
              }
              function o() {
                return !(!r || !t.T(r) || (s(), e("explore" !== r), 0));
              }
              o() ||
                (s(),
                (i = setInterval(o, 10)),
                (n = setTimeout(function () {
                  return (s(), e(!1));
                }, 1e4)));
            }
            static tt() {
              return /\/*.+\/saved\/$/.test(location.pathname);
            }
            static et() {
              return /\/*.+\/saved\/all-posts\/$/.test(location.pathname);
            }
            static it() {
              return /\/saved\/*.+\/[0-9]+\/$/.test(location.pathname);
            }
            static nt() {
              let t = location.pathname.match("/.+/tagged/");
              return t && t[0];
            }
            static rt() {
              let t = location.pathname.match("/.+/reels/");
              return t && t[0];
            }
            static st() {
              let e = t
                ._()
                .match(/(^\/p\/.+\/)|(^\/reel\/.+\/)|(^\/p\/.+)|(^\/reel\/.+)/);
              return e && e[0];
            }
            static ot(e) {
              if (t.st()) t.t = "post_page";
              else if (t.W()) t.t = "highlights_page;";
              else if (t.j()) t.t = "stories_page;";
              else if (t.V()) t.t = "main_timeline_page";
              else if (t.J()) t.t = "main_page";
              else if (t.N()) t.t = "reels_audio_page";
              else {
                if (t.G())
                  return t.ut(function (i) {
                    return ((t.t = i ? "reels_feed_page" : null), e(t.t));
                  });
                if (t.L()) t.t = "explorer_page";
                else if (t.O()) t.t = "explorer_location_page";
                else if (t.M()) t.t = "explorer_page";
                else if (t.F()) t.t = "explorer_page";
                else if (t.tt()) t.t = "user_saved_preview_page";
                else if (t.et()) t.t = "user_saved_page";
                else if (t.it()) t.t = "user_saved_collection_page";
                else if (t.nt()) t.t = "user_tag_page";
                else if (t.rt()) t.t = "user_reels_page";
                else {
                  if (!t.K())
                    return t.Y(function (i) {
                      return ((t.t = i ? "user_feed_page" : null), e(t.t));
                    });
                  t.t = "guide_page";
                }
              }
              return e(t.t);
            }
            static ut(e) {
              let i = null,
                n = setInterval(function () {
                  if (t.H() || document.querySelector("video"))
                    return (
                      clearInterval(n),
                      (n = null),
                      i && clearTimeout(i),
                      (i = null),
                      e(!0)
                    );
                }, 50);
              i = setTimeout(function () {
                return (clearInterval(n), (n = null), e(!1));
              }, 5e3);
            }
            static ct() {
              return new Promise(function (t, e) {
                chrome.runtime.sendMessage(
                  { title: "get_download_status" },
                  function (e) {
                    t(e);
                  },
                );
              });
            }
            static lt() {
              return new Promise(function (e, i) {
                let n = new Date();
                n.setMonth(n.getMonth() - 1);
                let r = n.getTime() / 1e3;
                chrome.storage.local.get("inputDate", function (i) {
                  if (!i || !i.inputDate || !t.t) return e(r);
                  if (t.t && t.t.includes("user")) {
                    let n = t.P();
                    if (n && t.T(n)) {
                      let s = n + "_" + t.t;
                      return i.inputDate[s] ? e(i.inputDate[s]) : e(r);
                    }
                  }
                  return e(r);
                });
              });
            }
            static ft(t) {
              t.length > 28 && (t = t.substr(0, t.length - 28));
              const e = "abcdefghijklmnopqrstuvwxyz",
                i = e.toUpperCase() + e + "0123456789-_";
              let n = BigInt(0);
              for (let e of t) {
                let t = i.indexOf(e);
                ((n *= BigInt(64)), (n += BigInt(t)));
              }
              return n.toString();
            }
            static dt = "dark";
            static ht = "ok";
            static vt = "stop";
            static _t = "skip";
            static wt() {
              let e = localStorage.getItem("igt");
              return e && e === t.dt;
            }
            static bt() {
              let t =
                document.querySelector(`svg path[d*="${this.i}"]`) || null;
              if (!t) return;
              let e = (t && t.closest("button")) || null;
              e ? e.click() : t.parentElement.parentElement.click();
            }
            static gt(t) {
              return !t.closest("[hidden]");
            }
            static kt() {
              const t = Array.from(document.querySelectorAll("section")).find(
                (t) => !t.closest("[hidden]"),
              );
              return Array.from(t.querySelectorAll("div")).find((t) => {
                let e = t.clientHeight || t.offsetHeight;
                if (e > 0 && e < 6) return t.parentElement;
              });
            }
            static yt(e, i) {
              return {
                username: i._userName,
                id: e.id || e.pk || t.X(),
                url: i.url,
                fileExt: i.fileExt,
                takenAt: i.takenAt,
                collectionName: i._collectionName || i.collectionName || null,
                shortcode: i.shortcode || i.code || i.id || i.pk || null,
                y: i.creationTime.getFullYear().toString(),
                m: (i.creationTime.getMonth() + 1).toString().padStart(2, "0"),
                d: i.creationTime.getDate().toString().padStart(2, "0"),
                time: i.creationTime
                  .toTimeString()
                  .slice(0, 8)
                  .replace(/:/g, ""),
                tm: new Date().getTime().toString(),
                dm: i.creationTime.toISOString().split("T")[0],
                q: `${i.width}x${i.height}`,
                desc: (e.caption && e.caption.text) || "",
                lc: e.like_count || null,
                pc: e.play_count || null,
                cc: e.comment_count || null,
                pt: i.pageType,
                loc:
                  (e.location && e.location.name) ||
                  (e.location && e.location.short_name) ||
                  (e.location && e.location.city) ||
                  "",
                index: i.index || null,
                prefix: chrome.i18n.getMessage("massPrefix"),
                isThumb: i.isThumb || !1,
              };
            }
          };
        })();
      },
      7: (t, e, i) => {
        /*!

JSZip v3.5.0 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/
        !(function (e) {
          t.exports = e();
        })(function () {
          return (function t(e, i, n) {
            function r(o, a) {
              if (!i[o]) {
                if (!e[o]) {
                  var u = void 0;
                  if (0) return require(o, !0);
                  if (s) return s(o, !0);
                  var c = new Error("Cannot find module '" + o + "'");
                  throw ((c.code = "MODULE_NOT_FOUND"), c);
                }
                var l = (i[o] = { exports: {} });
                e[o][0].call(
                  l.exports,
                  function (t) {
                    var i;
                    return r(e[o][1][t] || t);
                  },
                  l,
                  l.exports,
                  t,
                  e,
                  i,
                  n,
                );
              }
              return i[o].exports;
            }
            for (var s = void 0, o = 0; o < n.length; o++) r(n[o]);
            return r;
          })(
            {
              1: [
                function (t, e, i) {
                  var n = t("./utils"),
                    r = t("./support"),
                    s =
                      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                  ((i.encode = function (t) {
                    for (
                      var e,
                        i,
                        r,
                        o,
                        a,
                        u,
                        c,
                        l = [],
                        f = 0,
                        d = t.length,
                        h = d,
                        m = "string" !== n.getTypeOf(t);
                      f < t.length;
                    )
                      ((h = d - f),
                        (r = m
                          ? ((e = t[f++]),
                            (i = f < d ? t[f++] : 0),
                            f < d ? t[f++] : 0)
                          : ((e = t.charCodeAt(f++)),
                            (i = f < d ? t.charCodeAt(f++) : 0),
                            f < d ? t.charCodeAt(f++) : 0)),
                        (o = e >> 2),
                        (a = ((3 & e) << 4) | (i >> 4)),
                        (u = 1 < h ? ((15 & i) << 2) | (r >> 6) : 64),
                        (c = 2 < h ? 63 & r : 64),
                        l.push(
                          s.charAt(o) + s.charAt(a) + s.charAt(u) + s.charAt(c),
                        ));
                    return l.join("");
                  }),
                    (i.decode = function (t) {
                      var e,
                        i,
                        n,
                        o,
                        a,
                        u,
                        c = 0,
                        l = 0,
                        f = "data:";
                      if (t.substr(0, 5) === f)
                        throw new Error(
                          "Invalid base64 input, it looks like a data url.",
                        );
                      var d,
                        h =
                          (3 *
                            (t = t.replace(/[^A-Za-z0-9\+\/\=]/g, "")).length) /
                          4;
                      if (
                        (t.charAt(t.length - 1) === s.charAt(64) && h--,
                        t.charAt(t.length - 2) === s.charAt(64) && h--,
                        h % 1 != 0)
                      )
                        throw new Error(
                          "Invalid base64 input, bad content length.",
                        );
                      for (
                        d = r.uint8array
                          ? new Uint8Array(0 | h)
                          : new Array(0 | h);
                        c < t.length;
                      )
                        ((e =
                          (s.indexOf(t.charAt(c++)) << 2) |
                          ((o = s.indexOf(t.charAt(c++))) >> 4)),
                          (i =
                            ((15 & o) << 4) |
                            ((a = s.indexOf(t.charAt(c++))) >> 2)),
                          (n = ((3 & a) << 6) | (u = s.indexOf(t.charAt(c++)))),
                          (d[l++] = e),
                          64 !== a && (d[l++] = i),
                          64 !== u && (d[l++] = n));
                      return d;
                    }));
                },
                { "./support": 30, "./utils": 32 },
              ],
              2: [
                function (t, e, i) {
                  var n = t("./external"),
                    r = t("./stream/DataWorker"),
                    s = t("./stream/DataLengthProbe"),
                    o = t("./stream/Crc32Probe");
                  function a(t, e, i, n, r) {
                    ((this.compressedSize = t),
                      (this.uncompressedSize = e),
                      (this.crc32 = i),
                      (this.compression = n),
                      (this.compressedContent = r));
                  }
                  ((s = t("./stream/DataLengthProbe")),
                    (a.prototype = {
                      getContentWorker: function () {
                        var t = new r(n.Promise.resolve(this.compressedContent))
                            .pipe(this.compression.uncompressWorker())
                            .pipe(new s("data_length")),
                          e = this;
                        return (
                          t.on("end", function () {
                            if (
                              this.streamInfo.data_length !== e.uncompressedSize
                            )
                              throw new Error(
                                "Bug : uncompressed data size mismatch",
                              );
                          }),
                          t
                        );
                      },
                      getCompressedWorker: function () {
                        return new r(n.Promise.resolve(this.compressedContent))
                          .withStreamInfo("compressedSize", this.compressedSize)
                          .withStreamInfo(
                            "uncompressedSize",
                            this.uncompressedSize,
                          )
                          .withStreamInfo("crc32", this.crc32)
                          .withStreamInfo("compression", this.compression);
                      },
                    }),
                    (a.createWorkerFrom = function (t, e, i) {
                      return t
                        .pipe(new o())
                        .pipe(new s("uncompressedSize"))
                        .pipe(e.compressWorker(i))
                        .pipe(new s("compressedSize"))
                        .withStreamInfo("compression", e);
                    }),
                    (e.exports = a));
                },
                {
                  "./external": 6,
                  "./stream/Crc32Probe": 25,
                  "./stream/DataLengthProbe": 26,
                  "./stream/DataWorker": 27,
                },
              ],
              3: [
                function (t, e, i) {
                  var n = t("./stream/GenericWorker");
                  ((i.STORE = {
                    magic: "\0\0",
                    compressWorker: function (t) {
                      return new n("STORE compression");
                    },
                    uncompressWorker: function () {
                      return new n("STORE decompression");
                    },
                  }),
                    (i.DEFLATE = t("./flate")));
                },
                { "./flate": 7, "./stream/GenericWorker": 28 },
              ],
              4: [
                function (t, e, i) {
                  var n = t("./utils"),
                    r = (function () {
                      for (var t, e = [], i = 0; i < 256; i++) {
                        t = i;
                        for (var n = 0; n < 8; n++)
                          t = 1 & t ? 3988292384 ^ (t >>> 1) : t >>> 1;
                        e[i] = t;
                      }
                      return e;
                    })();
                  e.exports = function (t, e) {
                    return void 0 !== t && t.length
                      ? "string" !== n.getTypeOf(t)
                        ? (function (t, e, i, n) {
                            var s = r,
                              o = 0 + i;
                            t ^= -1;
                            for (var a = 0; a < o; a++)
                              t = (t >>> 8) ^ s[255 & (t ^ e[a])];
                            return ~t;
                          })(0 | e, t, t.length, 0)
                        : (function (t, e, i, n) {
                            var s = r,
                              o = 0 + i;
                            t ^= -1;
                            for (var a = 0; a < o; a++)
                              t = (t >>> 8) ^ s[255 & (t ^ e.charCodeAt(a))];
                            return ~t;
                          })(0 | e, t, t.length, 0)
                      : 0;
                  };
                },
                { "./utils": 32 },
              ],
              5: [
                function (t, e, i) {
                  ((i.base64 = !1),
                    (i.binary = !1),
                    (i.dir = !1),
                    (i.createFolders = !0),
                    (i.date = null),
                    (i.compression = null),
                    (i.compressionOptions = null),
                    (i.comment = null),
                    (i.unixPermissions = null),
                    (i.dosPermissions = null));
                },
                {},
              ],
              6: [
                function (t, e, i) {
                  var n = null;
                  ((n = "undefined" != typeof Promise ? Promise : t("lie")),
                    (e.exports = { Promise: n }));
                },
                { lie: 37 },
              ],
              7: [
                function (t, e, i) {
                  var n =
                      "undefined" != typeof Uint8Array &&
                      "undefined" != typeof Uint16Array &&
                      "undefined" != typeof Uint32Array,
                    r = t("pako"),
                    s = t("./utils"),
                    o = t("./stream/GenericWorker"),
                    a = n ? "uint8array" : "array";
                  function u(t, e) {
                    (o.call(this, "FlateWorker/" + t),
                      (this._pako = null),
                      (this._pakoAction = t),
                      (this._pakoOptions = e),
                      (this.meta = {}));
                  }
                  ((i.magic = "\b\0"),
                    s.inherits(u, o),
                    (u.prototype.processChunk = function (t) {
                      ((this.meta = t.meta),
                        null === this._pako && this._createPako(),
                        this._pako.push(s.transformTo(a, t.data), !1));
                    }),
                    (u.prototype.flush = function () {
                      (o.prototype.flush.call(this),
                        null === this._pako && this._createPako(),
                        this._pako.push([], !0));
                    }),
                    (u.prototype.cleanUp = function () {
                      (o.prototype.cleanUp.call(this), (this._pako = null));
                    }),
                    (u.prototype._createPako = function () {
                      this._pako = new r[this._pakoAction]({
                        raw: !0,
                        level: this._pakoOptions.level || -1,
                      });
                      var t = this;
                      this._pako.onData = function (e) {
                        t.push({ data: e, meta: t.meta });
                      };
                    }),
                    (i.compressWorker = function (t) {
                      return new u("Deflate", t);
                    }),
                    (i.uncompressWorker = function () {
                      return new u("Inflate", {});
                    }));
                },
                { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 },
              ],
              8: [
                function (t, e, i) {
                  function n(t, e) {
                    var i,
                      n = "";
                    for (i = 0; i < e; i++)
                      ((n += String.fromCharCode(255 & t)), (t >>>= 8));
                    return n;
                  }
                  function r(t, e, i, r, o, l) {
                    var f,
                      d,
                      h = t.file,
                      m = t.compression,
                      v = l !== a.utf8encode,
                      p = s.transformTo("string", l(h.name)),
                      _ = s.transformTo("string", a.utf8encode(h.name)),
                      w = h.comment,
                      b = s.transformTo("string", l(w)),
                      g = s.transformTo("string", a.utf8encode(w)),
                      k = _.length !== h.name.length,
                      y = g.length !== w.length,
                      $ = "",
                      x = "",
                      E = "",
                      T = h.dir,
                      P = h.date,
                      I = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
                    (e && !i) ||
                      ((I.crc32 = t.crc32),
                      (I.compressedSize = t.compressedSize),
                      (I.uncompressedSize = t.uncompressedSize));
                    var A = 0;
                    (e && (A |= 8), v || (!k && !y) || (A |= 2048));
                    var S = 0,
                      N = 0;
                    (T && (S |= 16),
                      "UNIX" === o
                        ? ((N = 798),
                          (S |= (function (t, e) {
                            var i = t;
                            return (
                              t || (i = e ? 16893 : 33204),
                              (65535 & i) << 16
                            );
                          })(h.unixPermissions, T)))
                        : ((N = 20),
                          (S |= (function (t) {
                            return 63 & (t || 0);
                          })(h.dosPermissions))),
                      (f = P.getUTCHours()),
                      (f <<= 6),
                      (f |= P.getUTCMinutes()),
                      (f <<= 5),
                      (f |= P.getUTCSeconds() / 2),
                      (d = P.getUTCFullYear() - 1980),
                      (d <<= 4),
                      (d |= P.getUTCMonth() + 1),
                      (d <<= 5),
                      (d |= P.getUTCDate()),
                      k &&
                        ((x = n(1, 1) + n(u(p), 4) + _),
                        ($ += "up" + n(x.length, 2) + x)),
                      y &&
                        ((E = n(1, 1) + n(u(b), 4) + g),
                        ($ += "uc" + n(E.length, 2) + E)));
                    var D = "";
                    return (
                      (D += "\n\0"),
                      (D += n(A, 2)),
                      (D += m.magic),
                      (D += n(f, 2)),
                      (D += n(d, 2)),
                      (D += n(I.crc32, 4)),
                      (D += n(I.compressedSize, 4)),
                      (D += n(I.uncompressedSize, 4)),
                      (D += n(p.length, 2)),
                      (D += n($.length, 2)),
                      {
                        fileRecord: c.LOCAL_FILE_HEADER + D + p + $,
                        dirRecord:
                          c.CENTRAL_FILE_HEADER +
                          n(N, 2) +
                          D +
                          n(b.length, 2) +
                          "\0\0\0\0" +
                          n(S, 4) +
                          n(r, 4) +
                          p +
                          $ +
                          b,
                      }
                    );
                  }
                  var s = t("../utils"),
                    o = t("../stream/GenericWorker"),
                    a = t("../utf8"),
                    u = t("../crc32"),
                    c = t("../signature");
                  function l(t, e, i, n) {
                    (o.call(this, "ZipFileWorker"),
                      (this.bytesWritten = 0),
                      (this.zipComment = e),
                      (this.zipPlatform = i),
                      (this.encodeFileName = n),
                      (this.streamFiles = t),
                      (this.accumulate = !1),
                      (this.contentBuffer = []),
                      (this.dirRecords = []),
                      (this.currentSourceOffset = 0),
                      (this.entriesCount = 0),
                      (this.currentFile = null),
                      (this._sources = []));
                  }
                  (s.inherits(l, o),
                    (l.prototype.push = function (t) {
                      var e = t.meta.percent || 0,
                        i = this.entriesCount,
                        n = this._sources.length;
                      this.accumulate
                        ? this.contentBuffer.push(t)
                        : ((this.bytesWritten += t.data.length),
                          o.prototype.push.call(this, {
                            data: t.data,
                            meta: {
                              currentFile: this.currentFile,
                              percent: i ? (e + 100 * (i - n - 1)) / i : 100,
                            },
                          }));
                    }),
                    (l.prototype.openedSource = function (t) {
                      ((this.currentSourceOffset = this.bytesWritten),
                        (this.currentFile = t.file.name));
                      var e = this.streamFiles && !t.file.dir;
                      if (e) {
                        var i = r(
                          t,
                          e,
                          !1,
                          this.currentSourceOffset,
                          this.zipPlatform,
                          this.encodeFileName,
                        );
                        this.push({ data: i.fileRecord, meta: { percent: 0 } });
                      } else this.accumulate = !0;
                    }),
                    (l.prototype.closedSource = function (t) {
                      this.accumulate = !1;
                      var e = this.streamFiles && !t.file.dir,
                        i = r(
                          t,
                          e,
                          !0,
                          this.currentSourceOffset,
                          this.zipPlatform,
                          this.encodeFileName,
                        );
                      if ((this.dirRecords.push(i.dirRecord), e))
                        this.push({
                          data: (function (t) {
                            return (
                              c.DATA_DESCRIPTOR +
                              n(t.crc32, 4) +
                              n(t.compressedSize, 4) +
                              n(t.uncompressedSize, 4)
                            );
                          })(t),
                          meta: { percent: 100 },
                        });
                      else
                        for (
                          this.push({
                            data: i.fileRecord,
                            meta: { percent: 0 },
                          });
                          this.contentBuffer.length;
                        )
                          this.push(this.contentBuffer.shift());
                      this.currentFile = null;
                    }),
                    (l.prototype.flush = function () {
                      for (
                        var t = this.bytesWritten, e = 0;
                        e < this.dirRecords.length;
                        e++
                      )
                        this.push({
                          data: this.dirRecords[e],
                          meta: { percent: 100 },
                        });
                      var i = this.bytesWritten - t,
                        r = (function (t, e, i, r, o) {
                          var a = s.transformTo("string", o(r));
                          return (
                            c.CENTRAL_DIRECTORY_END +
                            "\0\0\0\0" +
                            n(t, 2) +
                            n(t, 2) +
                            n(e, 4) +
                            n(i, 4) +
                            n(a.length, 2) +
                            a
                          );
                        })(
                          this.dirRecords.length,
                          i,
                          t,
                          this.zipComment,
                          this.encodeFileName,
                        );
                      this.push({ data: r, meta: { percent: 100 } });
                    }),
                    (l.prototype.prepareNextSource = function () {
                      ((this.previous = this._sources.shift()),
                        this.openedSource(this.previous.streamInfo),
                        this.isPaused
                          ? this.previous.pause()
                          : this.previous.resume());
                    }),
                    (l.prototype.registerPrevious = function (t) {
                      this._sources.push(t);
                      var e = this;
                      return (
                        t.on("data", function (t) {
                          e.processChunk(t);
                        }),
                        t.on("end", function () {
                          (e.closedSource(e.previous.streamInfo),
                            e._sources.length
                              ? e.prepareNextSource()
                              : e.end());
                        }),
                        t.on("error", function (t) {
                          e.error(t);
                        }),
                        this
                      );
                    }),
                    (l.prototype.resume = function () {
                      return (
                        !!o.prototype.resume.call(this) &&
                        (!this.previous && this._sources.length
                          ? (this.prepareNextSource(), !0)
                          : this.previous ||
                              this._sources.length ||
                              this.generatedError
                            ? void 0
                            : (this.end(), !0))
                      );
                    }),
                    (l.prototype.error = function (t) {
                      var e = this._sources;
                      if (!o.prototype.error.call(this, t)) return !1;
                      for (var i = 0; i < e.length; i++)
                        try {
                          e[i].error(t);
                        } catch (t) {}
                      return !0;
                    }),
                    (l.prototype.lock = function () {
                      o.prototype.lock.call(this);
                      for (var t = this._sources, e = 0; e < t.length; e++)
                        t[e].lock();
                    }),
                    (e.exports = l));
                },
                {
                  "../crc32": 4,
                  "../signature": 23,
                  "../stream/GenericWorker": 28,
                  "../utf8": 31,
                  "../utils": 32,
                },
              ],
              9: [
                function (t, e, i) {
                  var n = t("../compressions"),
                    r = t("./ZipFileWorker");
                  i.generateWorker = function (t, e, i) {
                    var s = new r(
                        e.streamFiles,
                        i,
                        e.platform,
                        e.encodeFileName,
                      ),
                      o = 0;
                    try {
                      (t.forEach(function (t, i) {
                        o++;
                        var r = (function (t, e) {
                            var i = t || e,
                              r = n[i];
                            if (!r)
                              throw new Error(
                                i + " is not a valid compression method !",
                              );
                            return r;
                          })(i.options.compression, e.compression),
                          a =
                            i.options.compressionOptions ||
                            e.compressionOptions ||
                            {},
                          u = i.dir,
                          c = i.date;
                        i._compressWorker(r, a)
                          .withStreamInfo("file", {
                            name: t,
                            dir: u,
                            date: c,
                            comment: i.comment || "",
                            unixPermissions: i.unixPermissions,
                            dosPermissions: i.dosPermissions,
                          })
                          .pipe(s);
                      }),
                        (s.entriesCount = o));
                    } catch (t) {
                      s.error(t);
                    }
                    return s;
                  };
                },
                { "../compressions": 3, "./ZipFileWorker": 8 },
              ],
              10: [
                function (t, e, i) {
                  function n() {
                    if (!(this instanceof n)) return new n();
                    if (arguments.length)
                      throw new Error(
                        "The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.",
                      );
                    ((this.files = {}),
                      (this.comment = null),
                      (this.root = ""),
                      (this.clone = function () {
                        var t = new n();
                        for (var e in this)
                          "function" != typeof this[e] && (t[e] = this[e]);
                        return t;
                      }));
                  }
                  (((n.prototype = t("./object")).loadAsync = t("./load")),
                    (n.support = t("./support")),
                    (n.defaults = t("./defaults")),
                    (n.version = "3.5.0"),
                    (n.loadAsync = function (t, e) {
                      return new n().loadAsync(t, e);
                    }),
                    (n.external = t("./external")),
                    (e.exports = n));
                },
                {
                  "./defaults": 5,
                  "./external": 6,
                  "./load": 11,
                  "./object": 15,
                  "./support": 30,
                },
              ],
              11: [
                function (t, e, i) {
                  var n = t("./utils"),
                    r = t("./external"),
                    s = t("./utf8"),
                    o = ((n = t("./utils")), t("./zipEntries")),
                    a = t("./stream/Crc32Probe"),
                    u = t("./nodejsUtils");
                  function c(t) {
                    return new r.Promise(function (e, i) {
                      var n = t.decompressed.getContentWorker().pipe(new a());
                      n.on("error", function (t) {
                        i(t);
                      })
                        .on("end", function () {
                          n.streamInfo.crc32 !== t.decompressed.crc32
                            ? i(new Error("Corrupted zip : CRC32 mismatch"))
                            : e();
                        })
                        .resume();
                    });
                  }
                  e.exports = function (t, e) {
                    var i = this;
                    return (
                      (e = n.extend(e || {}, {
                        base64: !1,
                        checkCRC32: !1,
                        optimizedBinaryString: !1,
                        createFolders: !1,
                        decodeFileName: s.utf8decode,
                      })),
                      u.isNode && u.isStream(t)
                        ? r.Promise.reject(
                            new Error(
                              "JSZip can't accept a stream when loading a zip file.",
                            ),
                          )
                        : n
                            .prepareContent(
                              "the loaded zip file",
                              t,
                              !0,
                              e.optimizedBinaryString,
                              e.base64,
                            )
                            .then(function (t) {
                              var i = new o(e);
                              return (i.load(t), i);
                            })
                            .then(function (t) {
                              var i = [r.Promise.resolve(t)],
                                n = t.files;
                              if (e.checkCRC32)
                                for (var s = 0; s < n.length; s++)
                                  i.push(c(n[s]));
                              return r.Promise.all(i);
                            })
                            .then(function (t) {
                              for (
                                var n = t.shift(), r = n.files, s = 0;
                                s < r.length;
                                s++
                              ) {
                                var o = r[s];
                                i.file(o.fileNameStr, o.decompressed, {
                                  binary: !0,
                                  optimizedBinaryString: !0,
                                  date: o.date,
                                  dir: o.dir,
                                  comment: o.fileCommentStr.length
                                    ? o.fileCommentStr
                                    : null,
                                  unixPermissions: o.unixPermissions,
                                  dosPermissions: o.dosPermissions,
                                  createFolders: e.createFolders,
                                });
                              }
                              return (
                                n.zipComment.length &&
                                  (i.comment = n.zipComment),
                                i
                              );
                            })
                    );
                  };
                },
                {
                  "./external": 6,
                  "./nodejsUtils": 14,
                  "./stream/Crc32Probe": 25,
                  "./utf8": 31,
                  "./utils": 32,
                  "./zipEntries": 33,
                },
              ],
              12: [
                function (t, e, i) {
                  var n = t("../utils"),
                    r = t("../stream/GenericWorker");
                  function s(t, e) {
                    (r.call(this, "Nodejs stream input adapter for " + t),
                      (this._upstreamEnded = !1),
                      this._bindStream(e));
                  }
                  (n.inherits(s, r),
                    (s.prototype._bindStream = function (t) {
                      var e = this;
                      ((this._stream = t).pause(),
                        t
                          .on("data", function (t) {
                            e.push({ data: t, meta: { percent: 0 } });
                          })
                          .on("error", function (t) {
                            e.isPaused ? (this.generatedError = t) : e.error(t);
                          })
                          .on("end", function () {
                            e.isPaused ? (e._upstreamEnded = !0) : e.end();
                          }));
                    }),
                    (s.prototype.pause = function () {
                      return (
                        !!r.prototype.pause.call(this) &&
                        (this._stream.pause(), !0)
                      );
                    }),
                    (s.prototype.resume = function () {
                      return (
                        !!r.prototype.resume.call(this) &&
                        (this._upstreamEnded
                          ? this.end()
                          : this._stream.resume(),
                        !0)
                      );
                    }),
                    (e.exports = s));
                },
                { "../stream/GenericWorker": 28, "../utils": 32 },
              ],
              13: [
                function (t, e, i) {
                  var n = t("readable-stream").Readable;
                  function r(t, e, i) {
                    (n.call(this, e), (this._helper = t));
                    var r = this;
                    t.on("data", function (t, e) {
                      (r.push(t) || r._helper.pause(), i && i(e));
                    })
                      .on("error", function (t) {
                        r.emit("error", t);
                      })
                      .on("end", function () {
                        r.push(null);
                      });
                  }
                  (t("../utils").inherits(r, n),
                    (r.prototype._read = function () {
                      this._helper.resume();
                    }),
                    (e.exports = r));
                },
                { "../utils": 32, "readable-stream": 16 },
              ],
              14: [
                function (t, e, i) {
                  e.exports = {
                    isNode: "undefined" != typeof Buffer,
                    newBufferFrom: function (t, e) {
                      if (Buffer.from && Buffer.from !== Uint8Array.from)
                        return Buffer.from(t, e);
                      if ("number" == typeof t)
                        throw new Error(
                          'The "data" argument must not be a number',
                        );
                      return new Buffer(t, e);
                    },
                    allocBuffer: function (t) {
                      if (Buffer.alloc) return Buffer.alloc(t);
                      var e = new Buffer(t);
                      return (e.fill(0), e);
                    },
                    isBuffer: function (t) {
                      return Buffer.isBuffer(t);
                    },
                    isStream: function (t) {
                      return (
                        t &&
                        "function" == typeof t.on &&
                        "function" == typeof t.pause &&
                        "function" == typeof t.resume
                      );
                    },
                  };
                },
                {},
              ],
              15: [
                function (t, e, i) {
                  function n(t, e, i) {
                    var n,
                      r = s.getTypeOf(e),
                      a = s.extend(i || {}, u);
                    ((a.date = a.date || new Date()),
                      null !== a.compression &&
                        (a.compression = a.compression.toUpperCase()),
                      "string" == typeof a.unixPermissions &&
                        (a.unixPermissions = parseInt(a.unixPermissions, 8)),
                      a.unixPermissions &&
                        16384 & a.unixPermissions &&
                        (a.dir = !0),
                      a.dosPermissions && 16 & a.dosPermissions && (a.dir = !0),
                      a.dir && (t = v(t)),
                      a.createFolders && (n = m(t)) && p.call(this, n, !0));
                    var f =
                      "string" === r && !1 === a.binary && !1 === a.base64;
                    ((i && void 0 !== i.binary) || (a.binary = !f),
                      ((e instanceof c && 0 === e.uncompressedSize) ||
                        a.dir ||
                        !e ||
                        0 === e.length) &&
                        ((a.base64 = !1),
                        (a.binary = !0),
                        (e = ""),
                        (a.compression = "STORE"),
                        (r = "string")));
                    var _ = null;
                    _ =
                      e instanceof c || e instanceof o
                        ? e
                        : d.isNode && d.isStream(e)
                          ? new h(t, e)
                          : s.prepareContent(
                              t,
                              e,
                              a.binary,
                              a.optimizedBinaryString,
                              a.base64,
                            );
                    var w = new l(t, _, a);
                    this.files[t] = w;
                  }
                  var r = t("./utf8"),
                    s = t("./utils"),
                    o = t("./stream/GenericWorker"),
                    a = t("./stream/StreamHelper"),
                    u = t("./defaults"),
                    c = t("./compressedObject"),
                    l = t("./zipObject"),
                    f = t("./generate"),
                    d = t("./nodejsUtils"),
                    h = t("./nodejs/NodejsStreamInputAdapter"),
                    m = function (t) {
                      "/" === t.slice(-1) && (t = t.substring(0, t.length - 1));
                      var e = t.lastIndexOf("/");
                      return 0 < e ? t.substring(0, e) : "";
                    },
                    v = function (t) {
                      return ("/" !== t.slice(-1) && (t += "/"), t);
                    },
                    p = function (t, e) {
                      return (
                        (e = void 0 !== e ? e : u.createFolders),
                        (t = v(t)),
                        this.files[t] ||
                          n.call(this, t, null, { dir: !0, createFolders: e }),
                        this.files[t]
                      );
                    };
                  function _(t) {
                    return (
                      "[object RegExp]" === Object.prototype.toString.call(t)
                    );
                  }
                  var w = {
                    load: function () {
                      throw new Error(
                        "This method has been removed in JSZip 3.0, please check the upgrade guide.",
                      );
                    },
                    forEach: function (t) {
                      var e, i, n;
                      for (e in this.files)
                        this.files.hasOwnProperty(e) &&
                          ((n = this.files[e]),
                          (i = e.slice(this.root.length, e.length)) &&
                            e.slice(0, this.root.length) === this.root &&
                            t(i, n));
                    },
                    filter: function (t) {
                      var e = [];
                      return (
                        this.forEach(function (i, n) {
                          t(i, n) && e.push(n);
                        }),
                        e
                      );
                    },
                    file: function (t, e, i) {
                      if (1 !== arguments.length)
                        return (
                          (t = this.root + t),
                          n.call(this, t, e, i),
                          this
                        );
                      if (_(t)) {
                        var r = t;
                        return this.filter(function (t, e) {
                          return !e.dir && r.test(t);
                        });
                      }
                      var s = this.files[this.root + t];
                      return s && !s.dir ? s : null;
                    },
                    folder: function (t) {
                      if (!t) return this;
                      if (_(t))
                        return this.filter(function (e, i) {
                          return i.dir && t.test(e);
                        });
                      var e = this.root + t,
                        i = p.call(this, e),
                        n = this.clone();
                      return ((n.root = i.name), n);
                    },
                    remove: function (t) {
                      t = this.root + t;
                      var e = this.files[t];
                      if (
                        (e ||
                          ("/" !== t.slice(-1) && (t += "/"),
                          (e = this.files[t])),
                        e && !e.dir)
                      )
                        delete this.files[t];
                      else
                        for (
                          var i = this.filter(function (e, i) {
                              return i.name.slice(0, t.length) === t;
                            }),
                            n = 0;
                          n < i.length;
                          n++
                        )
                          delete this.files[i[n].name];
                      return this;
                    },
                    generate: function (t) {
                      throw new Error(
                        "This method has been removed in JSZip 3.0, please check the upgrade guide.",
                      );
                    },
                    generateInternalStream: function (t) {
                      var e,
                        i = {};
                      try {
                        if (
                          (((i = s.extend(t || {}, {
                            streamFiles: !1,
                            compression: "STORE",
                            compressionOptions: null,
                            type: "",
                            platform: "DOS",
                            comment: null,
                            mimeType: "application/zip",
                            encodeFileName: r.utf8encode,
                          })).type = i.type.toLowerCase()),
                          (i.compression = i.compression.toUpperCase()),
                          "binarystring" === i.type && (i.type = "string"),
                          !i.type)
                        )
                          throw new Error("No output type specified.");
                        (s.checkSupport(i.type),
                          ("darwin" !== i.platform &&
                            "freebsd" !== i.platform &&
                            "linux" !== i.platform &&
                            "sunos" !== i.platform) ||
                            (i.platform = "UNIX"),
                          "win32" === i.platform && (i.platform = "DOS"));
                        var n = i.comment || this.comment || "";
                        e = f.generateWorker(this, i, n);
                      } catch (t) {
                        (e = new o("error")).error(t);
                      }
                      return new a(e, i.type || "string", i.mimeType);
                    },
                    generateAsync: function (t, e) {
                      return this.generateInternalStream(t).accumulate(e);
                    },
                    generateNodeStream: function (t, e) {
                      return (
                        (t = t || {}).type || (t.type = "nodebuffer"),
                        this.generateInternalStream(t).toNodejsStream(e)
                      );
                    },
                  };
                  e.exports = w;
                },
                {
                  "./compressedObject": 2,
                  "./defaults": 5,
                  "./generate": 9,
                  "./nodejs/NodejsStreamInputAdapter": 12,
                  "./nodejsUtils": 14,
                  "./stream/GenericWorker": 28,
                  "./stream/StreamHelper": 29,
                  "./utf8": 31,
                  "./utils": 32,
                  "./zipObject": 35,
                },
              ],
              16: [
                function (t, e, i) {
                  e.exports = t("stream");
                },
                { stream: void 0 },
              ],
              17: [
                function (t, e, i) {
                  var n = t("./DataReader");
                  function r(t) {
                    n.call(this, t);
                    for (var e = 0; e < this.data.length; e++)
                      t[e] = 255 & t[e];
                  }
                  (t("../utils").inherits(r, n),
                    (r.prototype.byteAt = function (t) {
                      return this.data[this.zero + t];
                    }),
                    (r.prototype.lastIndexOfSignature = function (t) {
                      for (
                        var e = t.charCodeAt(0),
                          i = t.charCodeAt(1),
                          n = t.charCodeAt(2),
                          r = t.charCodeAt(3),
                          s = this.length - 4;
                        0 <= s;
                        --s
                      )
                        if (
                          this.data[s] === e &&
                          this.data[s + 1] === i &&
                          this.data[s + 2] === n &&
                          this.data[s + 3] === r
                        )
                          return s - this.zero;
                      return -1;
                    }),
                    (r.prototype.readAndCheckSignature = function (t) {
                      var e = t.charCodeAt(0),
                        i = t.charCodeAt(1),
                        n = t.charCodeAt(2),
                        r = t.charCodeAt(3),
                        s = this.readData(4);
                      return (
                        e === s[0] && i === s[1] && n === s[2] && r === s[3]
                      );
                    }),
                    (r.prototype.readData = function (t) {
                      if ((this.checkOffset(t), 0 === t)) return [];
                      var e = this.data.slice(
                        this.zero + this.index,
                        this.zero + this.index + t,
                      );
                      return ((this.index += t), e);
                    }),
                    (e.exports = r));
                },
                { "../utils": 32, "./DataReader": 18 },
              ],
              18: [
                function (t, e, i) {
                  var n = t("../utils");
                  function r(t) {
                    ((this.data = t),
                      (this.length = t.length),
                      (this.index = 0),
                      (this.zero = 0));
                  }
                  ((r.prototype = {
                    checkOffset: function (t) {
                      this.checkIndex(this.index + t);
                    },
                    checkIndex: function (t) {
                      if (this.length < this.zero + t || t < 0)
                        throw new Error(
                          "End of data reached (data length = " +
                            this.length +
                            ", asked index = " +
                            t +
                            "). Corrupted zip ?",
                        );
                    },
                    setIndex: function (t) {
                      (this.checkIndex(t), (this.index = t));
                    },
                    skip: function (t) {
                      this.setIndex(this.index + t);
                    },
                    byteAt: function (t) {},
                    readInt: function (t) {
                      var e,
                        i = 0;
                      for (
                        this.checkOffset(t), e = this.index + t - 1;
                        e >= this.index;
                        e--
                      )
                        i = (i << 8) + this.byteAt(e);
                      return ((this.index += t), i);
                    },
                    readString: function (t) {
                      return n.transformTo("string", this.readData(t));
                    },
                    readData: function (t) {},
                    lastIndexOfSignature: function (t) {},
                    readAndCheckSignature: function (t) {},
                    readDate: function () {
                      var t = this.readInt(4);
                      return new Date(
                        Date.UTC(
                          1980 + ((t >> 25) & 127),
                          ((t >> 21) & 15) - 1,
                          (t >> 16) & 31,
                          (t >> 11) & 31,
                          (t >> 5) & 63,
                          (31 & t) << 1,
                        ),
                      );
                    },
                  }),
                    (e.exports = r));
                },
                { "../utils": 32 },
              ],
              19: [
                function (t, e, i) {
                  var n = t("./Uint8ArrayReader");
                  function r(t) {
                    n.call(this, t);
                  }
                  (t("../utils").inherits(r, n),
                    (r.prototype.readData = function (t) {
                      this.checkOffset(t);
                      var e = this.data.slice(
                        this.zero + this.index,
                        this.zero + this.index + t,
                      );
                      return ((this.index += t), e);
                    }),
                    (e.exports = r));
                },
                { "../utils": 32, "./Uint8ArrayReader": 21 },
              ],
              20: [
                function (t, e, i) {
                  var n = t("./DataReader");
                  function r(t) {
                    n.call(this, t);
                  }
                  (t("../utils").inherits(r, n),
                    (r.prototype.byteAt = function (t) {
                      return this.data.charCodeAt(this.zero + t);
                    }),
                    (r.prototype.lastIndexOfSignature = function (t) {
                      return this.data.lastIndexOf(t) - this.zero;
                    }),
                    (r.prototype.readAndCheckSignature = function (t) {
                      return t === this.readData(4);
                    }),
                    (r.prototype.readData = function (t) {
                      this.checkOffset(t);
                      var e = this.data.slice(
                        this.zero + this.index,
                        this.zero + this.index + t,
                      );
                      return ((this.index += t), e);
                    }),
                    (e.exports = r));
                },
                { "../utils": 32, "./DataReader": 18 },
              ],
              21: [
                function (t, e, i) {
                  var n = t("./ArrayReader");
                  function r(t) {
                    n.call(this, t);
                  }
                  (t("../utils").inherits(r, n),
                    (r.prototype.readData = function (t) {
                      if ((this.checkOffset(t), 0 === t))
                        return new Uint8Array(0);
                      var e = this.data.subarray(
                        this.zero + this.index,
                        this.zero + this.index + t,
                      );
                      return ((this.index += t), e);
                    }),
                    (e.exports = r));
                },
                { "../utils": 32, "./ArrayReader": 17 },
              ],
              22: [
                function (t, e, i) {
                  var n = t("../utils"),
                    r = t("../support"),
                    s = t("./ArrayReader"),
                    o = t("./StringReader"),
                    a = t("./NodeBufferReader"),
                    u = t("./Uint8ArrayReader");
                  e.exports = function (t) {
                    var e = n.getTypeOf(t);
                    return (
                      n.checkSupport(e),
                      "string" !== e || r.uint8array
                        ? "nodebuffer" === e
                          ? new a(t)
                          : r.uint8array
                            ? new u(n.transformTo("uint8array", t))
                            : new s(n.transformTo("array", t))
                        : new o(t)
                    );
                  };
                },
                {
                  "../support": 30,
                  "../utils": 32,
                  "./ArrayReader": 17,
                  "./NodeBufferReader": 19,
                  "./StringReader": 20,
                  "./Uint8ArrayReader": 21,
                },
              ],
              23: [
                function (t, e, i) {
                  ((i.LOCAL_FILE_HEADER = "PK"),
                    (i.CENTRAL_FILE_HEADER = "PK"),
                    (i.CENTRAL_DIRECTORY_END = "PK"),
                    (i.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK"),
                    (i.ZIP64_CENTRAL_DIRECTORY_END = "PK"),
                    (i.DATA_DESCRIPTOR = "PK\b"));
                },
                {},
              ],
              24: [
                function (t, e, i) {
                  var n = t("./GenericWorker"),
                    r = t("../utils");
                  function s(t) {
                    (n.call(this, "ConvertWorker to " + t),
                      (this.destType = t));
                  }
                  (r.inherits(s, n),
                    (s.prototype.processChunk = function (t) {
                      this.push({
                        data: r.transformTo(this.destType, t.data),
                        meta: t.meta,
                      });
                    }),
                    (e.exports = s));
                },
                { "../utils": 32, "./GenericWorker": 28 },
              ],
              25: [
                function (t, e, i) {
                  var n = t("./GenericWorker"),
                    r = t("../crc32");
                  function s() {
                    (n.call(this, "Crc32Probe"),
                      this.withStreamInfo("crc32", 0));
                  }
                  (t("../utils").inherits(s, n),
                    (s.prototype.processChunk = function (t) {
                      ((this.streamInfo.crc32 = r(
                        t.data,
                        this.streamInfo.crc32 || 0,
                      )),
                        this.push(t));
                    }),
                    (e.exports = s));
                },
                { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 },
              ],
              26: [
                function (t, e, i) {
                  var n = t("../utils"),
                    r = t("./GenericWorker");
                  function s(t) {
                    (r.call(this, "DataLengthProbe for " + t),
                      (this.propName = t),
                      this.withStreamInfo(t, 0));
                  }
                  (n.inherits(s, r),
                    (s.prototype.processChunk = function (t) {
                      if (t) {
                        var e = this.streamInfo[this.propName] || 0;
                        this.streamInfo[this.propName] = e + t.data.length;
                      }
                      r.prototype.processChunk.call(this, t);
                    }),
                    (e.exports = s));
                },
                { "../utils": 32, "./GenericWorker": 28 },
              ],
              27: [
                function (t, e, i) {
                  var n = t("../utils"),
                    r = t("./GenericWorker");
                  function s(t) {
                    r.call(this, "DataWorker");
                    var e = this;
                    ((this.dataIsReady = !1),
                      (this.index = 0),
                      (this.max = 0),
                      (this.data = null),
                      (this.type = ""),
                      (this._tickScheduled = !1),
                      t.then(
                        function (t) {
                          ((e.dataIsReady = !0),
                            (e.data = t),
                            (e.max = (t && t.length) || 0),
                            (e.type = n.getTypeOf(t)),
                            e.isPaused || e._tickAndRepeat());
                        },
                        function (t) {
                          e.error(t);
                        },
                      ));
                  }
                  (n.inherits(s, r),
                    (s.prototype.cleanUp = function () {
                      (r.prototype.cleanUp.call(this), (this.data = null));
                    }),
                    (s.prototype.resume = function () {
                      return (
                        !!r.prototype.resume.call(this) &&
                        (!this._tickScheduled &&
                          this.dataIsReady &&
                          ((this._tickScheduled = !0),
                          n.delay(this._tickAndRepeat, [], this)),
                        !0)
                      );
                    }),
                    (s.prototype._tickAndRepeat = function () {
                      ((this._tickScheduled = !1),
                        this.isPaused ||
                          this.isFinished ||
                          (this._tick(),
                          this.isFinished ||
                            (n.delay(this._tickAndRepeat, [], this),
                            (this._tickScheduled = !0))));
                    }),
                    (s.prototype._tick = function () {
                      if (this.isPaused || this.isFinished) return !1;
                      var t = null,
                        e = Math.min(this.max, this.index + 16384);
                      if (this.index >= this.max) return this.end();
                      switch (this.type) {
                        case "string":
                          t = this.data.substring(this.index, e);
                          break;
                        case "uint8array":
                          t = this.data.subarray(this.index, e);
                          break;
                        case "array":
                        case "nodebuffer":
                          t = this.data.slice(this.index, e);
                      }
                      return (
                        (this.index = e),
                        this.push({
                          data: t,
                          meta: {
                            percent: this.max
                              ? (this.index / this.max) * 100
                              : 0,
                          },
                        })
                      );
                    }),
                    (e.exports = s));
                },
                { "../utils": 32, "./GenericWorker": 28 },
              ],
              28: [
                function (t, e, i) {
                  function n(t) {
                    ((this.name = t || "default"),
                      (this.streamInfo = {}),
                      (this.generatedError = null),
                      (this.extraStreamInfo = {}),
                      (this.isPaused = !0),
                      (this.isFinished = !1),
                      (this.isLocked = !1),
                      (this._listeners = { data: [], end: [], error: [] }),
                      (this.previous = null));
                  }
                  ((n.prototype = {
                    push: function (t) {
                      this.emit("data", t);
                    },
                    end: function () {
                      if (this.isFinished) return !1;
                      this.flush();
                      try {
                        (this.emit("end"),
                          this.cleanUp(),
                          (this.isFinished = !0));
                      } catch (t) {
                        this.emit("error", t);
                      }
                      return !0;
                    },
                    error: function (t) {
                      return (
                        !this.isFinished &&
                        (this.isPaused
                          ? (this.generatedError = t)
                          : ((this.isFinished = !0),
                            this.emit("error", t),
                            this.previous && this.previous.error(t),
                            this.cleanUp()),
                        !0)
                      );
                    },
                    on: function (t, e) {
                      return (this._listeners[t].push(e), this);
                    },
                    cleanUp: function () {
                      ((this.streamInfo =
                        this.generatedError =
                        this.extraStreamInfo =
                          null),
                        (this._listeners = []));
                    },
                    emit: function (t, e) {
                      if (this._listeners[t])
                        for (var i = 0; i < this._listeners[t].length; i++)
                          this._listeners[t][i].call(this, e);
                    },
                    pipe: function (t) {
                      return t.registerPrevious(this);
                    },
                    registerPrevious: function (t) {
                      if (this.isLocked)
                        throw new Error(
                          "The stream '" + this + "' has already been used.",
                        );
                      ((this.streamInfo = t.streamInfo),
                        this.mergeStreamInfo(),
                        (this.previous = t));
                      var e = this;
                      return (
                        t.on("data", function (t) {
                          e.processChunk(t);
                        }),
                        t.on("end", function () {
                          e.end();
                        }),
                        t.on("error", function (t) {
                          e.error(t);
                        }),
                        this
                      );
                    },
                    pause: function () {
                      return (
                        !this.isPaused &&
                        !this.isFinished &&
                        ((this.isPaused = !0),
                        this.previous && this.previous.pause(),
                        !0)
                      );
                    },
                    resume: function () {
                      if (!this.isPaused || this.isFinished) return !1;
                      var t = (this.isPaused = !1);
                      return (
                        this.generatedError &&
                          (this.error(this.generatedError), (t = !0)),
                        this.previous && this.previous.resume(),
                        !t
                      );
                    },
                    flush: function () {},
                    processChunk: function (t) {
                      this.push(t);
                    },
                    withStreamInfo: function (t, e) {
                      return (
                        (this.extraStreamInfo[t] = e),
                        this.mergeStreamInfo(),
                        this
                      );
                    },
                    mergeStreamInfo: function () {
                      for (var t in this.extraStreamInfo)
                        this.extraStreamInfo.hasOwnProperty(t) &&
                          (this.streamInfo[t] = this.extraStreamInfo[t]);
                    },
                    lock: function () {
                      if (this.isLocked)
                        throw new Error(
                          "The stream '" + this + "' has already been used.",
                        );
                      ((this.isLocked = !0),
                        this.previous && this.previous.lock());
                    },
                    toString: function () {
                      var t = "Worker " + this.name;
                      return this.previous ? this.previous + " -> " + t : t;
                    },
                  }),
                    (e.exports = n));
                },
                {},
              ],
              29: [
                function (t, e, i) {
                  var n = t("../utils"),
                    r = t("./ConvertWorker"),
                    s = t("./GenericWorker"),
                    o = t("../base64"),
                    a = t("../support"),
                    u = t("../external"),
                    c = null;
                  if (a.nodestream)
                    try {
                      c = t("../nodejs/NodejsStreamOutputAdapter");
                    } catch (t) {}
                  function l(t, e) {
                    return new u.Promise(function (i, r) {
                      var s = [],
                        a = t._internalType,
                        u = t._outputType,
                        c = t._mimeType;
                      t.on("data", function (t, i) {
                        (s.push(t), e && e(i));
                      })
                        .on("error", function (t) {
                          ((s = []), r(t));
                        })
                        .on("end", function () {
                          try {
                            var t = (function (t, e, i) {
                              switch (t) {
                                case "blob":
                                  return n.newBlob(
                                    n.transformTo("arraybuffer", e),
                                    i,
                                  );
                                case "base64":
                                  return o.encode(e);
                                default:
                                  return n.transformTo(t, e);
                              }
                            })(
                              u,
                              (function (t, e) {
                                var i,
                                  n = 0,
                                  r = null,
                                  s = 0;
                                for (i = 0; i < e.length; i++) s += e[i].length;
                                switch (t) {
                                  case "string":
                                    return e.join("");
                                  case "array":
                                    return Array.prototype.concat.apply([], e);
                                  case "uint8array":
                                    for (
                                      r = new Uint8Array(s), i = 0;
                                      i < e.length;
                                      i++
                                    )
                                      (r.set(e[i], n), (n += e[i].length));
                                    return r;
                                  case "nodebuffer":
                                    return Buffer.concat(e);
                                  default:
                                    throw new Error(
                                      "concat : unsupported type '" + t + "'",
                                    );
                                }
                              })(a, s),
                              c,
                            );
                            i(t);
                          } catch (t) {
                            r(t);
                          }
                          s = [];
                        })
                        .resume();
                    });
                  }
                  function f(t, e, i) {
                    var o = e;
                    switch (e) {
                      case "blob":
                      case "arraybuffer":
                        o = "uint8array";
                        break;
                      case "base64":
                        o = "string";
                    }
                    try {
                      ((this._internalType = o),
                        (this._outputType = e),
                        (this._mimeType = i),
                        n.checkSupport(o),
                        (this._worker = t.pipe(new r(o))),
                        t.lock());
                    } catch (t) {
                      ((this._worker = new s("error")), this._worker.error(t));
                    }
                  }
                  ((f.prototype = {
                    accumulate: function (t) {
                      return l(this, t);
                    },
                    on: function (t, e) {
                      var i = this;
                      return (
                        "data" === t
                          ? this._worker.on(t, function (t) {
                              e.call(i, t.data, t.meta);
                            })
                          : this._worker.on(t, function () {
                              n.delay(e, arguments, i);
                            }),
                        this
                      );
                    },
                    resume: function () {
                      return (
                        n.delay(this._worker.resume, [], this._worker),
                        this
                      );
                    },
                    pause: function () {
                      return (this._worker.pause(), this);
                    },
                    toNodejsStream: function (t) {
                      if (
                        (n.checkSupport("nodestream"),
                        "nodebuffer" !== this._outputType)
                      )
                        throw new Error(
                          this._outputType + " is not supported by this method",
                        );
                      return new c(
                        this,
                        { objectMode: "nodebuffer" !== this._outputType },
                        t,
                      );
                    },
                  }),
                    (e.exports = f));
                },
                {
                  "../base64": 1,
                  "../external": 6,
                  "../nodejs/NodejsStreamOutputAdapter": 13,
                  "../support": 30,
                  "../utils": 32,
                  "./ConvertWorker": 24,
                  "./GenericWorker": 28,
                },
              ],
              30: [
                function (t, e, i) {
                  if (
                    ((i.base64 = !0),
                    (i.array = !0),
                    (i.string = !0),
                    (i.arraybuffer =
                      "undefined" != typeof ArrayBuffer &&
                      "undefined" != typeof Uint8Array),
                    (i.nodebuffer = "undefined" != typeof Buffer),
                    (i.uint8array = "undefined" != typeof Uint8Array),
                    "undefined" == typeof ArrayBuffer)
                  )
                    i.blob = !1;
                  else {
                    var n = new ArrayBuffer(0);
                    try {
                      i.blob =
                        0 === new Blob([n], { type: "application/zip" }).size;
                    } catch (t) {
                      try {
                        var r = new (
                          self.BlobBuilder ||
                          self.WebKitBlobBuilder ||
                          self.MozBlobBuilder ||
                          self.MSBlobBuilder
                        )();
                        (r.append(n),
                          (i.blob = 0 === r.getBlob("application/zip").size));
                      } catch (t) {
                        i.blob = !1;
                      }
                    }
                  }
                  try {
                    i.nodestream = !!t("readable-stream").Readable;
                  } catch (t) {
                    i.nodestream = !1;
                  }
                },
                { "readable-stream": 16 },
              ],
              31: [
                function (t, e, i) {
                  for (
                    var n = t("./utils"),
                      r = t("./support"),
                      s = t("./nodejsUtils"),
                      o = t("./stream/GenericWorker"),
                      a = new Array(256),
                      u = 0;
                    u < 256;
                    u++
                  )
                    a[u] =
                      252 <= u
                        ? 6
                        : 248 <= u
                          ? 5
                          : 240 <= u
                            ? 4
                            : 224 <= u
                              ? 3
                              : 192 <= u
                                ? 2
                                : 1;
                  function c() {
                    (o.call(this, "utf-8 decode"), (this.leftOver = null));
                  }
                  function l() {
                    o.call(this, "utf-8 encode");
                  }
                  ((a[254] = a[254] = 1),
                    (i.utf8encode = function (t) {
                      return r.nodebuffer
                        ? s.newBufferFrom(t, "utf-8")
                        : (function (t) {
                            var e,
                              i,
                              n,
                              s,
                              o,
                              a = t.length,
                              u = 0;
                            for (s = 0; s < a; s++)
                              (55296 == (64512 & (i = t.charCodeAt(s))) &&
                                s + 1 < a &&
                                56320 == (64512 & (n = t.charCodeAt(s + 1))) &&
                                ((i =
                                  65536 + ((i - 55296) << 10) + (n - 56320)),
                                s++),
                                (u +=
                                  i < 128
                                    ? 1
                                    : i < 2048
                                      ? 2
                                      : i < 65536
                                        ? 3
                                        : 4));
                            for (
                              e = r.uint8array
                                ? new Uint8Array(u)
                                : new Array(u),
                                s = o = 0;
                              o < u;
                              s++
                            )
                              (55296 == (64512 & (i = t.charCodeAt(s))) &&
                                s + 1 < a &&
                                56320 == (64512 & (n = t.charCodeAt(s + 1))) &&
                                ((i =
                                  65536 + ((i - 55296) << 10) + (n - 56320)),
                                s++),
                                i < 128
                                  ? (e[o++] = i)
                                  : (i < 2048
                                      ? (e[o++] = 192 | (i >>> 6))
                                      : (i < 65536
                                          ? (e[o++] = 224 | (i >>> 12))
                                          : ((e[o++] = 240 | (i >>> 18)),
                                            (e[o++] = 128 | ((i >>> 12) & 63))),
                                        (e[o++] = 128 | ((i >>> 6) & 63))),
                                    (e[o++] = 128 | (63 & i))));
                            return e;
                          })(t);
                    }),
                    (i.utf8decode = function (t) {
                      return r.nodebuffer
                        ? n.transformTo("nodebuffer", t).toString("utf-8")
                        : (function (t) {
                            var e,
                              i,
                              r,
                              s,
                              o = t.length,
                              u = new Array(2 * o);
                            for (e = i = 0; e < o; )
                              if ((r = t[e++]) < 128) u[i++] = r;
                              else if (4 < (s = a[r]))
                                ((u[i++] = 65533), (e += s - 1));
                              else {
                                for (
                                  r &= 2 === s ? 31 : 3 === s ? 15 : 7;
                                  1 < s && e < o;
                                )
                                  ((r = (r << 6) | (63 & t[e++])), s--);
                                1 < s
                                  ? (u[i++] = 65533)
                                  : r < 65536
                                    ? (u[i++] = r)
                                    : ((r -= 65536),
                                      (u[i++] = 55296 | ((r >> 10) & 1023)),
                                      (u[i++] = 56320 | (1023 & r)));
                              }
                            return (
                              u.length !== i &&
                                (u.subarray
                                  ? (u = u.subarray(0, i))
                                  : (u.length = i)),
                              n.applyFromCharCode(u)
                            );
                          })(
                            (t = n.transformTo(
                              r.uint8array ? "uint8array" : "array",
                              t,
                            )),
                          );
                    }),
                    n.inherits(c, o),
                    (c.prototype.processChunk = function (t) {
                      var e = n.transformTo(
                        r.uint8array ? "uint8array" : "array",
                        t.data,
                      );
                      if (this.leftOver && this.leftOver.length) {
                        if (r.uint8array) {
                          var s = e;
                          ((e = new Uint8Array(
                            s.length + this.leftOver.length,
                          )).set(this.leftOver, 0),
                            e.set(s, this.leftOver.length));
                        } else e = this.leftOver.concat(e);
                        this.leftOver = null;
                      }
                      var o = (function (t, e) {
                          var i;
                          for (
                            (e = e || t.length) > t.length && (e = t.length),
                              i = e - 1;
                            0 <= i && 128 == (192 & t[i]);
                          )
                            i--;
                          return i < 0 || 0 === i ? e : i + a[t[i]] > e ? i : e;
                        })(e),
                        u = e;
                      (o !== e.length &&
                        (r.uint8array
                          ? ((u = e.subarray(0, o)),
                            (this.leftOver = e.subarray(o, e.length)))
                          : ((u = e.slice(0, o)),
                            (this.leftOver = e.slice(o, e.length)))),
                        this.push({ data: i.utf8decode(u), meta: t.meta }));
                    }),
                    (c.prototype.flush = function () {
                      this.leftOver &&
                        this.leftOver.length &&
                        (this.push({
                          data: i.utf8decode(this.leftOver),
                          meta: {},
                        }),
                        (this.leftOver = null));
                    }),
                    (i.Utf8DecodeWorker = c),
                    n.inherits(l, o),
                    (l.prototype.processChunk = function (t) {
                      this.push({ data: i.utf8encode(t.data), meta: t.meta });
                    }),
                    (i.Utf8EncodeWorker = l));
                },
                {
                  "./nodejsUtils": 14,
                  "./stream/GenericWorker": 28,
                  "./support": 30,
                  "./utils": 32,
                },
              ],
              32: [
                function (t, e, i) {
                  var n = t("./support"),
                    r = t("./base64"),
                    s = t("./nodejsUtils"),
                    o = t("set-immediate-shim"),
                    a = t("./external");
                  function u(t) {
                    return t;
                  }
                  function c(t, e) {
                    for (var i = 0; i < t.length; ++i)
                      e[i] = 255 & t.charCodeAt(i);
                    return e;
                  }
                  i.newBlob = function (t, e) {
                    i.checkSupport("blob");
                    try {
                      return new Blob([t], { type: e });
                    } catch (i) {
                      try {
                        var n = new (
                          self.BlobBuilder ||
                          self.WebKitBlobBuilder ||
                          self.MozBlobBuilder ||
                          self.MSBlobBuilder
                        )();
                        return (n.append(t), n.getBlob(e));
                      } catch (t) {
                        throw new Error("Bug : can't construct the Blob.");
                      }
                    }
                  };
                  var l = {
                    stringifyByChunk: function (t, e, i) {
                      var n = [],
                        r = 0,
                        s = t.length;
                      if (s <= i) return String.fromCharCode.apply(null, t);
                      for (; r < s; )
                        ("array" === e || "nodebuffer" === e
                          ? n.push(
                              String.fromCharCode.apply(
                                null,
                                t.slice(r, Math.min(r + i, s)),
                              ),
                            )
                          : n.push(
                              String.fromCharCode.apply(
                                null,
                                t.subarray(r, Math.min(r + i, s)),
                              ),
                            ),
                          (r += i));
                      return n.join("");
                    },
                    stringifyByChar: function (t) {
                      for (var e = "", i = 0; i < t.length; i++)
                        e += String.fromCharCode(t[i]);
                      return e;
                    },
                    applyCanBeUsed: {
                      uint8array: (function () {
                        try {
                          return (
                            n.uint8array &&
                            1 ===
                              String.fromCharCode.apply(null, new Uint8Array(1))
                                .length
                          );
                        } catch (t) {
                          return !1;
                        }
                      })(),
                      nodebuffer: (function () {
                        try {
                          return (
                            n.nodebuffer &&
                            1 ===
                              String.fromCharCode.apply(null, s.allocBuffer(1))
                                .length
                          );
                        } catch (t) {
                          return !1;
                        }
                      })(),
                    },
                  };
                  function f(t) {
                    var e = 65536,
                      n = i.getTypeOf(t),
                      r = !0;
                    if (
                      ("uint8array" === n
                        ? (r = l.applyCanBeUsed.uint8array)
                        : "nodebuffer" === n &&
                          (r = l.applyCanBeUsed.nodebuffer),
                      r)
                    )
                      for (; 1 < e; )
                        try {
                          return l.stringifyByChunk(t, n, e);
                        } catch (t) {
                          e = Math.floor(e / 2);
                        }
                    return l.stringifyByChar(t);
                  }
                  function d(t, e) {
                    for (var i = 0; i < t.length; i++) e[i] = t[i];
                    return e;
                  }
                  i.applyFromCharCode = f;
                  var h = {};
                  ((h.string = {
                    string: u,
                    array: function (t) {
                      return c(t, new Array(t.length));
                    },
                    arraybuffer: function (t) {
                      return h.string.uint8array(t).buffer;
                    },
                    uint8array: function (t) {
                      return c(t, new Uint8Array(t.length));
                    },
                    nodebuffer: function (t) {
                      return c(t, s.allocBuffer(t.length));
                    },
                  }),
                    (h.array = {
                      string: f,
                      array: u,
                      arraybuffer: function (t) {
                        return new Uint8Array(t).buffer;
                      },
                      uint8array: function (t) {
                        return new Uint8Array(t);
                      },
                      nodebuffer: function (t) {
                        return s.newBufferFrom(t);
                      },
                    }),
                    (h.arraybuffer = {
                      string: function (t) {
                        return f(new Uint8Array(t));
                      },
                      array: function (t) {
                        return d(new Uint8Array(t), new Array(t.byteLength));
                      },
                      arraybuffer: u,
                      uint8array: function (t) {
                        return new Uint8Array(t);
                      },
                      nodebuffer: function (t) {
                        return s.newBufferFrom(new Uint8Array(t));
                      },
                    }),
                    (h.uint8array = {
                      string: f,
                      array: function (t) {
                        return d(t, new Array(t.length));
                      },
                      arraybuffer: function (t) {
                        return t.buffer;
                      },
                      uint8array: u,
                      nodebuffer: function (t) {
                        return s.newBufferFrom(t);
                      },
                    }),
                    (h.nodebuffer = {
                      string: f,
                      array: function (t) {
                        return d(t, new Array(t.length));
                      },
                      arraybuffer: function (t) {
                        return h.nodebuffer.uint8array(t).buffer;
                      },
                      uint8array: function (t) {
                        return d(t, new Uint8Array(t.length));
                      },
                      nodebuffer: u,
                    }),
                    (i.transformTo = function (t, e) {
                      if (((e = e || ""), !t)) return e;
                      i.checkSupport(t);
                      var n = i.getTypeOf(e);
                      return h[n][t](e);
                    }),
                    (i.getTypeOf = function (t) {
                      return "string" == typeof t
                        ? "string"
                        : "[object Array]" === Object.prototype.toString.call(t)
                          ? "array"
                          : n.nodebuffer && s.isBuffer(t)
                            ? "nodebuffer"
                            : n.uint8array && t instanceof Uint8Array
                              ? "uint8array"
                              : n.arraybuffer && t instanceof ArrayBuffer
                                ? "arraybuffer"
                                : void 0;
                    }),
                    (i.checkSupport = function (t) {
                      if (!n[t.toLowerCase()])
                        throw new Error(
                          t + " is not supported by this platform",
                        );
                    }),
                    (i.MAX_VALUE_16BITS = 65535),
                    (i.MAX_VALUE_32BITS = -1),
                    (i.pretty = function (t) {
                      var e,
                        i,
                        n = "";
                      for (i = 0; i < (t || "").length; i++)
                        n +=
                          "\\x" +
                          ((e = t.charCodeAt(i)) < 16 ? "0" : "") +
                          e.toString(16).toUpperCase();
                      return n;
                    }),
                    (i.delay = function (t, e, i) {
                      o(function () {
                        t.apply(i || null, e || []);
                      });
                    }),
                    (i.inherits = function (t, e) {
                      function i() {}
                      ((i.prototype = e.prototype), (t.prototype = new i()));
                    }),
                    (i.extend = function () {
                      var t,
                        e,
                        i = {};
                      for (t = 0; t < arguments.length; t++)
                        for (e in arguments[t])
                          arguments[t].hasOwnProperty(e) &&
                            void 0 === i[e] &&
                            (i[e] = arguments[t][e]);
                      return i;
                    }),
                    (i.prepareContent = function (t, e, s, o, u) {
                      return a.Promise.resolve(e)
                        .then(function (t) {
                          return n.blob &&
                            (t instanceof Blob ||
                              -1 !==
                                ["[object File]", "[object Blob]"].indexOf(
                                  Object.prototype.toString.call(t),
                                )) &&
                            "undefined" != typeof FileReader
                            ? new a.Promise(function (e, i) {
                                var n = new FileReader();
                                ((n.onload = function (t) {
                                  e(t.target.result);
                                }),
                                  (n.onerror = function (t) {
                                    i(t.target.error);
                                  }),
                                  n.readAsArrayBuffer(t));
                              })
                            : t;
                        })
                        .then(function (e) {
                          var l = i.getTypeOf(e);
                          return l
                            ? ("arraybuffer" === l
                                ? (e = i.transformTo("uint8array", e))
                                : "string" === l &&
                                  (u
                                    ? (e = r.decode(e))
                                    : s &&
                                      !0 !== o &&
                                      (e = (function (t) {
                                        return c(
                                          t,
                                          n.uint8array
                                            ? new Uint8Array(t.length)
                                            : new Array(t.length),
                                        );
                                      })(e))),
                              e)
                            : a.Promise.reject(
                                new Error(
                                  "Can't read the data of '" +
                                    t +
                                    "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?",
                                ),
                              );
                        });
                    }));
                },
                {
                  "./base64": 1,
                  "./external": 6,
                  "./nodejsUtils": 14,
                  "./support": 30,
                  "set-immediate-shim": 54,
                },
              ],
              33: [
                function (t, e, i) {
                  var n = t("./reader/readerFor"),
                    r = t("./utils"),
                    s = t("./signature"),
                    o = t("./zipEntry"),
                    a = (t("./utf8"), t("./support"));
                  function u(t) {
                    ((this.files = []), (this.loadOptions = t));
                  }
                  ((u.prototype = {
                    checkSignature: function (t) {
                      if (!this.reader.readAndCheckSignature(t)) {
                        this.reader.index -= 4;
                        var e = this.reader.readString(4);
                        throw new Error(
                          "Corrupted zip or bug: unexpected signature (" +
                            r.pretty(e) +
                            ", expected " +
                            r.pretty(t) +
                            ")",
                        );
                      }
                    },
                    isSignature: function (t, e) {
                      var i = this.reader.index;
                      this.reader.setIndex(t);
                      var n = this.reader.readString(4) === e;
                      return (this.reader.setIndex(i), n);
                    },
                    readBlockEndOfCentral: function () {
                      ((this.diskNumber = this.reader.readInt(2)),
                        (this.diskWithCentralDirStart = this.reader.readInt(2)),
                        (this.centralDirRecordsOnThisDisk =
                          this.reader.readInt(2)),
                        (this.centralDirRecords = this.reader.readInt(2)),
                        (this.centralDirSize = this.reader.readInt(4)),
                        (this.centralDirOffset = this.reader.readInt(4)),
                        (this.zipCommentLength = this.reader.readInt(2)));
                      var t = this.reader.readData(this.zipCommentLength),
                        e = a.uint8array ? "uint8array" : "array",
                        i = r.transformTo(e, t);
                      this.zipComment = this.loadOptions.decodeFileName(i);
                    },
                    readBlockZip64EndOfCentral: function () {
                      ((this.zip64EndOfCentralSize = this.reader.readInt(8)),
                        this.reader.skip(4),
                        (this.diskNumber = this.reader.readInt(4)),
                        (this.diskWithCentralDirStart = this.reader.readInt(4)),
                        (this.centralDirRecordsOnThisDisk =
                          this.reader.readInt(8)),
                        (this.centralDirRecords = this.reader.readInt(8)),
                        (this.centralDirSize = this.reader.readInt(8)),
                        (this.centralDirOffset = this.reader.readInt(8)),
                        (this.zip64ExtensibleData = {}));
                      for (
                        var t, e, i, n = this.zip64EndOfCentralSize - 44;
                        0 < n;
                      )
                        ((t = this.reader.readInt(2)),
                          (e = this.reader.readInt(4)),
                          (i = this.reader.readData(e)),
                          (this.zip64ExtensibleData[t] = {
                            id: t,
                            length: e,
                            value: i,
                          }));
                    },
                    readBlockZip64EndOfCentralLocator: function () {
                      if (
                        ((this.diskWithZip64CentralDirStart =
                          this.reader.readInt(4)),
                        (this.relativeOffsetEndOfZip64CentralDir =
                          this.reader.readInt(8)),
                        (this.disksCount = this.reader.readInt(4)),
                        1 < this.disksCount)
                      )
                        throw new Error("Multi-volumes zip are not supported");
                    },
                    readLocalFiles: function () {
                      var t, e;
                      for (t = 0; t < this.files.length; t++)
                        ((e = this.files[t]),
                          this.reader.setIndex(e.localHeaderOffset),
                          this.checkSignature(s.LOCAL_FILE_HEADER),
                          e.readLocalPart(this.reader),
                          e.handleUTF8(),
                          e.processAttributes());
                    },
                    readCentralDir: function () {
                      var t;
                      for (
                        this.reader.setIndex(this.centralDirOffset);
                        this.reader.readAndCheckSignature(
                          s.CENTRAL_FILE_HEADER,
                        );
                      )
                        ((t = new o(
                          { zip64: this.zip64 },
                          this.loadOptions,
                        )).readCentralPart(this.reader),
                          this.files.push(t));
                      if (
                        this.centralDirRecords !== this.files.length &&
                        0 !== this.centralDirRecords &&
                        0 === this.files.length
                      )
                        throw new Error(
                          "Corrupted zip or bug: expected " +
                            this.centralDirRecords +
                            " records in central dir, got " +
                            this.files.length,
                        );
                    },
                    readEndOfCentral: function () {
                      var t = this.reader.lastIndexOfSignature(
                        s.CENTRAL_DIRECTORY_END,
                      );
                      if (t < 0)
                        throw this.isSignature(0, s.LOCAL_FILE_HEADER)
                          ? new Error(
                              "Corrupted zip: can't find end of central directory",
                            )
                          : new Error(
                              "Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html",
                            );
                      this.reader.setIndex(t);
                      var e = t;
                      if (
                        (this.checkSignature(s.CENTRAL_DIRECTORY_END),
                        this.readBlockEndOfCentral(),
                        this.diskNumber === r.MAX_VALUE_16BITS ||
                          this.diskWithCentralDirStart === r.MAX_VALUE_16BITS ||
                          this.centralDirRecordsOnThisDisk ===
                            r.MAX_VALUE_16BITS ||
                          this.centralDirRecords === r.MAX_VALUE_16BITS ||
                          this.centralDirSize === r.MAX_VALUE_32BITS ||
                          this.centralDirOffset === r.MAX_VALUE_32BITS)
                      ) {
                        if (
                          ((this.zip64 = !0),
                          (t = this.reader.lastIndexOfSignature(
                            s.ZIP64_CENTRAL_DIRECTORY_LOCATOR,
                          )) < 0)
                        )
                          throw new Error(
                            "Corrupted zip: can't find the ZIP64 end of central directory locator",
                          );
                        if (
                          (this.reader.setIndex(t),
                          this.checkSignature(
                            s.ZIP64_CENTRAL_DIRECTORY_LOCATOR,
                          ),
                          this.readBlockZip64EndOfCentralLocator(),
                          !this.isSignature(
                            this.relativeOffsetEndOfZip64CentralDir,
                            s.ZIP64_CENTRAL_DIRECTORY_END,
                          ) &&
                            ((this.relativeOffsetEndOfZip64CentralDir =
                              this.reader.lastIndexOfSignature(
                                s.ZIP64_CENTRAL_DIRECTORY_END,
                              )),
                            this.relativeOffsetEndOfZip64CentralDir < 0))
                        )
                          throw new Error(
                            "Corrupted zip: can't find the ZIP64 end of central directory",
                          );
                        (this.reader.setIndex(
                          this.relativeOffsetEndOfZip64CentralDir,
                        ),
                          this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),
                          this.readBlockZip64EndOfCentral());
                      }
                      var i = this.centralDirOffset + this.centralDirSize;
                      this.zip64 &&
                        ((i += 20), (i += 12 + this.zip64EndOfCentralSize));
                      var n = e - i;
                      if (0 < n)
                        this.isSignature(e, s.CENTRAL_FILE_HEADER) ||
                          (this.reader.zero = n);
                      else if (n < 0)
                        throw new Error(
                          "Corrupted zip: missing " + Math.abs(n) + " bytes.",
                        );
                    },
                    prepareReader: function (t) {
                      this.reader = n(t);
                    },
                    load: function (t) {
                      (this.prepareReader(t),
                        this.readEndOfCentral(),
                        this.readCentralDir(),
                        this.readLocalFiles());
                    },
                  }),
                    (e.exports = u));
                },
                {
                  "./reader/readerFor": 22,
                  "./signature": 23,
                  "./support": 30,
                  "./utf8": 31,
                  "./utils": 32,
                  "./zipEntry": 34,
                },
              ],
              34: [
                function (t, e, i) {
                  var n = t("./reader/readerFor"),
                    r = t("./utils"),
                    s = t("./compressedObject"),
                    o = t("./crc32"),
                    a = t("./utf8"),
                    u = t("./compressions"),
                    c = t("./support");
                  function l(t, e) {
                    ((this.options = t), (this.loadOptions = e));
                  }
                  ((l.prototype = {
                    isEncrypted: function () {
                      return !(1 & ~this.bitFlag);
                    },
                    useUTF8: function () {
                      return !(2048 & ~this.bitFlag);
                    },
                    readLocalPart: function (t) {
                      var e, i;
                      if (
                        (t.skip(22),
                        (this.fileNameLength = t.readInt(2)),
                        (i = t.readInt(2)),
                        (this.fileName = t.readData(this.fileNameLength)),
                        t.skip(i),
                        -1 === this.compressedSize ||
                          -1 === this.uncompressedSize)
                      )
                        throw new Error(
                          "Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)",
                        );
                      if (
                        null ===
                        (e = (function (t) {
                          for (var e in u)
                            if (u.hasOwnProperty(e) && u[e].magic === t)
                              return u[e];
                          return null;
                        })(this.compressionMethod))
                      )
                        throw new Error(
                          "Corrupted zip : compression " +
                            r.pretty(this.compressionMethod) +
                            " unknown (inner file : " +
                            r.transformTo("string", this.fileName) +
                            ")",
                        );
                      this.decompressed = new s(
                        this.compressedSize,
                        this.uncompressedSize,
                        this.crc32,
                        e,
                        t.readData(this.compressedSize),
                      );
                    },
                    readCentralPart: function (t) {
                      ((this.versionMadeBy = t.readInt(2)),
                        t.skip(2),
                        (this.bitFlag = t.readInt(2)),
                        (this.compressionMethod = t.readString(2)),
                        (this.date = t.readDate()),
                        (this.crc32 = t.readInt(4)),
                        (this.compressedSize = t.readInt(4)),
                        (this.uncompressedSize = t.readInt(4)));
                      var e = t.readInt(2);
                      if (
                        ((this.extraFieldsLength = t.readInt(2)),
                        (this.fileCommentLength = t.readInt(2)),
                        (this.diskNumberStart = t.readInt(2)),
                        (this.internalFileAttributes = t.readInt(2)),
                        (this.externalFileAttributes = t.readInt(4)),
                        (this.localHeaderOffset = t.readInt(4)),
                        this.isEncrypted())
                      )
                        throw new Error("Encrypted zip are not supported");
                      (t.skip(e),
                        this.readExtraFields(t),
                        this.parseZIP64ExtraField(t),
                        (this.fileComment = t.readData(
                          this.fileCommentLength,
                        )));
                    },
                    processAttributes: function () {
                      ((this.unixPermissions = null),
                        (this.dosPermissions = null));
                      var t = this.versionMadeBy >> 8;
                      ((this.dir = !!(16 & this.externalFileAttributes)),
                        0 == t &&
                          (this.dosPermissions =
                            63 & this.externalFileAttributes),
                        3 == t &&
                          (this.unixPermissions =
                            (this.externalFileAttributes >> 16) & 65535),
                        this.dir ||
                          "/" !== this.fileNameStr.slice(-1) ||
                          (this.dir = !0));
                    },
                    parseZIP64ExtraField: function (t) {
                      if (this.extraFields[1]) {
                        var e = n(this.extraFields[1].value);
                        (this.uncompressedSize === r.MAX_VALUE_32BITS &&
                          (this.uncompressedSize = e.readInt(8)),
                          this.compressedSize === r.MAX_VALUE_32BITS &&
                            (this.compressedSize = e.readInt(8)),
                          this.localHeaderOffset === r.MAX_VALUE_32BITS &&
                            (this.localHeaderOffset = e.readInt(8)),
                          this.diskNumberStart === r.MAX_VALUE_32BITS &&
                            (this.diskNumberStart = e.readInt(4)));
                      }
                    },
                    readExtraFields: function (t) {
                      var e,
                        i,
                        n,
                        r = t.index + this.extraFieldsLength;
                      for (
                        this.extraFields || (this.extraFields = {});
                        t.index + 4 < r;
                      )
                        ((e = t.readInt(2)),
                          (i = t.readInt(2)),
                          (n = t.readData(i)),
                          (this.extraFields[e] = {
                            id: e,
                            length: i,
                            value: n,
                          }));
                      t.setIndex(r);
                    },
                    handleUTF8: function () {
                      var t = c.uint8array ? "uint8array" : "array";
                      if (this.useUTF8())
                        ((this.fileNameStr = a.utf8decode(this.fileName)),
                          (this.fileCommentStr = a.utf8decode(
                            this.fileComment,
                          )));
                      else {
                        var e = this.findExtraFieldUnicodePath();
                        if (null !== e) this.fileNameStr = e;
                        else {
                          var i = r.transformTo(t, this.fileName);
                          this.fileNameStr = this.loadOptions.decodeFileName(i);
                        }
                        var n = this.findExtraFieldUnicodeComment();
                        if (null !== n) this.fileCommentStr = n;
                        else {
                          var s = r.transformTo(t, this.fileComment);
                          this.fileCommentStr =
                            this.loadOptions.decodeFileName(s);
                        }
                      }
                    },
                    findExtraFieldUnicodePath: function () {
                      var t = this.extraFields[28789];
                      if (t) {
                        var e = n(t.value);
                        return 1 !== e.readInt(1) ||
                          o(this.fileName) !== e.readInt(4)
                          ? null
                          : a.utf8decode(e.readData(t.length - 5));
                      }
                      return null;
                    },
                    findExtraFieldUnicodeComment: function () {
                      var t = this.extraFields[25461];
                      if (t) {
                        var e = n(t.value);
                        return 1 !== e.readInt(1) ||
                          o(this.fileComment) !== e.readInt(4)
                          ? null
                          : a.utf8decode(e.readData(t.length - 5));
                      }
                      return null;
                    },
                  }),
                    (e.exports = l));
                },
                {
                  "./compressedObject": 2,
                  "./compressions": 3,
                  "./crc32": 4,
                  "./reader/readerFor": 22,
                  "./support": 30,
                  "./utf8": 31,
                  "./utils": 32,
                },
              ],
              35: [
                function (t, e, i) {
                  function n(t, e, i) {
                    ((this.name = t),
                      (this.dir = i.dir),
                      (this.date = i.date),
                      (this.comment = i.comment),
                      (this.unixPermissions = i.unixPermissions),
                      (this.dosPermissions = i.dosPermissions),
                      (this._data = e),
                      (this._dataBinary = i.binary),
                      (this.options = {
                        compression: i.compression,
                        compressionOptions: i.compressionOptions,
                      }));
                  }
                  var r = t("./stream/StreamHelper"),
                    s = t("./stream/DataWorker"),
                    o = t("./utf8"),
                    a = t("./compressedObject"),
                    u = t("./stream/GenericWorker");
                  n.prototype = {
                    internalStream: function (t) {
                      var e = null,
                        i = "string";
                      try {
                        if (!t) throw new Error("No output type specified.");
                        var n =
                          "string" === (i = t.toLowerCase()) || "text" === i;
                        (("binarystring" !== i && "text" !== i) ||
                          (i = "string"),
                          (e = this._decompressWorker()));
                        var s = !this._dataBinary;
                        (s && !n && (e = e.pipe(new o.Utf8EncodeWorker())),
                          !s && n && (e = e.pipe(new o.Utf8DecodeWorker())));
                      } catch (t) {
                        (e = new u("error")).error(t);
                      }
                      return new r(e, i, "");
                    },
                    async: function (t, e) {
                      return this.internalStream(t).accumulate(e);
                    },
                    nodeStream: function (t, e) {
                      return this.internalStream(
                        t || "nodebuffer",
                      ).toNodejsStream(e);
                    },
                    _compressWorker: function (t, e) {
                      if (
                        this._data instanceof a &&
                        this._data.compression.magic === t.magic
                      )
                        return this._data.getCompressedWorker();
                      var i = this._decompressWorker();
                      return (
                        this._dataBinary ||
                          (i = i.pipe(new o.Utf8EncodeWorker())),
                        a.createWorkerFrom(i, t, e)
                      );
                    },
                    _decompressWorker: function () {
                      return this._data instanceof a
                        ? this._data.getContentWorker()
                        : this._data instanceof u
                          ? this._data
                          : new s(this._data);
                    },
                  };
                  for (
                    var c = [
                        "asText",
                        "asBinary",
                        "asNodeBuffer",
                        "asUint8Array",
                        "asArrayBuffer",
                      ],
                      l = function () {
                        throw new Error(
                          "This method has been removed in JSZip 3.0, please check the upgrade guide.",
                        );
                      },
                      f = 0;
                    f < c.length;
                    f++
                  )
                    n.prototype[c[f]] = l;
                  e.exports = n;
                },
                {
                  "./compressedObject": 2,
                  "./stream/DataWorker": 27,
                  "./stream/GenericWorker": 28,
                  "./stream/StreamHelper": 29,
                  "./utf8": 31,
                },
              ],
              36: [
                function (t, e, n) {
                  (function (t) {
                    var i,
                      n,
                      r = t.MutationObserver || t.WebKitMutationObserver;
                    if (r) {
                      var s = 0,
                        o = new r(l),
                        a = t.document.createTextNode("");
                      (o.observe(a, { characterData: !0 }),
                        (i = function () {
                          a.data = s = ++s % 2;
                        }));
                    } else if (t.setImmediate || void 0 === t.MessageChannel)
                      i =
                        "document" in t &&
                        "onreadystatechange" in
                          t.document.createElement("script")
                          ? function () {
                              var e = t.document.createElement("script");
                              ((e.onreadystatechange = function () {
                                (l(),
                                  (e.onreadystatechange = null),
                                  e.parentNode.removeChild(e),
                                  (e = null));
                              }),
                                t.document.documentElement.appendChild(e));
                            }
                          : function () {
                              setTimeout(l, 0);
                            };
                    else {
                      var u = new t.MessageChannel();
                      ((u.port1.onmessage = l),
                        (i = function () {
                          u.port2.postMessage(0);
                        }));
                    }
                    var c = [];
                    function l() {
                      var t, e;
                      n = !0;
                      for (var i = c.length; i; ) {
                        for (e = c, c = [], t = -1; ++t < i; ) e[t]();
                        i = c.length;
                      }
                      n = !1;
                    }
                    e.exports = function (t) {
                      1 !== c.push(t) || n || i();
                    };
                  }).call(
                    this,
                    void 0 !== i.g
                      ? i.g
                      : "undefined" != typeof self
                        ? self
                        : "undefined" != typeof window
                          ? window
                          : {},
                  );
                },
                {},
              ],
              37: [
                function (t, e, i) {
                  var n = t("immediate");
                  function r() {}
                  var s = {},
                    o = ["REJECTED"],
                    a = ["FULFILLED"],
                    u = ["PENDING"];
                  function c(t) {
                    if ("function" != typeof t)
                      throw new TypeError("resolver must be a function");
                    ((this.state = u),
                      (this.queue = []),
                      (this.outcome = void 0),
                      t !== r && h(this, t));
                  }
                  function l(t, e, i) {
                    ((this.promise = t),
                      "function" == typeof e &&
                        ((this.onFulfilled = e),
                        (this.callFulfilled = this.otherCallFulfilled)),
                      "function" == typeof i &&
                        ((this.onRejected = i),
                        (this.callRejected = this.otherCallRejected)));
                  }
                  function f(t, e, i) {
                    n(function () {
                      var n;
                      try {
                        n = e(i);
                      } catch (n) {
                        return s.reject(t, n);
                      }
                      n === t
                        ? s.reject(
                            t,
                            new TypeError("Cannot resolve promise with itself"),
                          )
                        : s.resolve(t, n);
                    });
                  }
                  function d(t) {
                    var e = t && t.then;
                    if (
                      t &&
                      ("object" == typeof t || "function" == typeof t) &&
                      "function" == typeof e
                    )
                      return function () {
                        e.apply(t, arguments);
                      };
                  }
                  function h(t, e) {
                    var i = !1;
                    function n(e) {
                      i || ((i = !0), s.reject(t, e));
                    }
                    function r(e) {
                      i || ((i = !0), s.resolve(t, e));
                    }
                    var o = m(function () {
                      e(r, n);
                    });
                    "error" === o.status && n(o.value);
                  }
                  function m(t, e) {
                    var i = {};
                    try {
                      ((i.value = t(e)), (i.status = "success"));
                    } catch (t) {
                      ((i.status = "error"), (i.value = t));
                    }
                    return i;
                  }
                  (((e.exports = c).prototype.finally = function (t) {
                    if ("function" != typeof t) return this;
                    var e = this.constructor;
                    return this.then(
                      function (i) {
                        return e.resolve(t()).then(function () {
                          return i;
                        });
                      },
                      function (i) {
                        return e.resolve(t()).then(function () {
                          throw i;
                        });
                      },
                    );
                  }),
                    (c.prototype.catch = function (t) {
                      return this.then(null, t);
                    }),
                    (c.prototype.then = function (t, e) {
                      if (
                        ("function" != typeof t && this.state === a) ||
                        ("function" != typeof e && this.state === o)
                      )
                        return this;
                      var i = new this.constructor(r);
                      return (
                        this.state !== u
                          ? f(i, this.state === a ? t : e, this.outcome)
                          : this.queue.push(new l(i, t, e)),
                        i
                      );
                    }),
                    (l.prototype.callFulfilled = function (t) {
                      s.resolve(this.promise, t);
                    }),
                    (l.prototype.otherCallFulfilled = function (t) {
                      f(this.promise, this.onFulfilled, t);
                    }),
                    (l.prototype.callRejected = function (t) {
                      s.reject(this.promise, t);
                    }),
                    (l.prototype.otherCallRejected = function (t) {
                      f(this.promise, this.onRejected, t);
                    }),
                    (s.resolve = function (t, e) {
                      var i = m(d, e);
                      if ("error" === i.status) return s.reject(t, i.value);
                      var n = i.value;
                      if (n) h(t, n);
                      else {
                        ((t.state = a), (t.outcome = e));
                        for (var r = -1, o = t.queue.length; ++r < o; )
                          t.queue[r].callFulfilled(e);
                      }
                      return t;
                    }),
                    (s.reject = function (t, e) {
                      ((t.state = o), (t.outcome = e));
                      for (var i = -1, n = t.queue.length; ++i < n; )
                        t.queue[i].callRejected(e);
                      return t;
                    }),
                    (c.resolve = function (t) {
                      return t instanceof this ? t : s.resolve(new this(r), t);
                    }),
                    (c.reject = function (t) {
                      var e = new this(r);
                      return s.reject(e, t);
                    }),
                    (c.all = function (t) {
                      var e = this;
                      if (
                        "[object Array]" !== Object.prototype.toString.call(t)
                      )
                        return this.reject(new TypeError("must be an array"));
                      var i = t.length,
                        n = !1;
                      if (!i) return this.resolve([]);
                      for (
                        var o = new Array(i), a = 0, u = -1, c = new this(r);
                        ++u < i;
                      )
                        l(t[u], u);
                      return c;
                      function l(t, r) {
                        e.resolve(t).then(
                          function (t) {
                            ((o[r] = t),
                              ++a !== i || n || ((n = !0), s.resolve(c, o)));
                          },
                          function (t) {
                            n || ((n = !0), s.reject(c, t));
                          },
                        );
                      }
                    }),
                    (c.race = function (t) {
                      var e = this;
                      if (
                        "[object Array]" !== Object.prototype.toString.call(t)
                      )
                        return this.reject(new TypeError("must be an array"));
                      var i = t.length,
                        n = !1;
                      if (!i) return this.resolve([]);
                      for (var o = -1, a = new this(r), u; ++o < i; )
                        ((u = t[o]),
                          e.resolve(u).then(
                            function (t) {
                              n || ((n = !0), s.resolve(a, t));
                            },
                            function (t) {
                              n || ((n = !0), s.reject(a, t));
                            },
                          ));
                      return a;
                    }));
                },
                { immediate: 36 },
              ],
              38: [
                function (t, e, i) {
                  var n = {};
                  ((0, t("./lib/utils/common").assign)(
                    n,
                    t("./lib/deflate"),
                    t("./lib/inflate"),
                    t("./lib/zlib/constants"),
                  ),
                    (e.exports = n));
                },
                {
                  "./lib/deflate": 39,
                  "./lib/inflate": 40,
                  "./lib/utils/common": 41,
                  "./lib/zlib/constants": 44,
                },
              ],
              39: [
                function (t, e, i) {
                  var n = t("./zlib/deflate"),
                    r = t("./utils/common"),
                    s = t("./utils/strings"),
                    o = t("./zlib/messages"),
                    a = t("./zlib/zstream"),
                    u = Object.prototype.toString,
                    c = 0,
                    l = -1,
                    f = 0,
                    d = 8;
                  function h(t) {
                    if (!(this instanceof h)) return new h(t);
                    this.options = r.assign(
                      {
                        level: l,
                        method: 8,
                        chunkSize: 16384,
                        windowBits: 15,
                        memLevel: 8,
                        strategy: 0,
                        to: "",
                      },
                      t || {},
                    );
                    var e = this.options;
                    (e.raw && 0 < e.windowBits
                      ? (e.windowBits = -e.windowBits)
                      : e.gzip &&
                        0 < e.windowBits &&
                        e.windowBits < 16 &&
                        (e.windowBits += 16),
                      (this.err = 0),
                      (this.msg = ""),
                      (this.ended = !1),
                      (this.chunks = []),
                      (this.strm = new a()),
                      (this.strm.avail_out = 0));
                    var i = n.deflateInit2(
                      this.strm,
                      e.level,
                      e.method,
                      e.windowBits,
                      e.memLevel,
                      e.strategy,
                    );
                    if (0 !== i) throw new Error(o[i]);
                    if (
                      (e.header && n.deflateSetHeader(this.strm, e.header),
                      e.dictionary)
                    ) {
                      var c;
                      if (
                        ((c =
                          "string" == typeof e.dictionary
                            ? s.string2buf(e.dictionary)
                            : "[object ArrayBuffer]" === u.call(e.dictionary)
                              ? new Uint8Array(e.dictionary)
                              : e.dictionary),
                        0 !== (i = n.deflateSetDictionary(this.strm, c)))
                      )
                        throw new Error(o[i]);
                      this._dict_set = !0;
                    }
                  }
                  function m(t, e) {
                    var i = new h(e);
                    if ((i.push(t, !0), i.err)) throw i.msg || o[i.err];
                    return i.result;
                  }
                  ((h.prototype.push = function (t, e) {
                    var i,
                      o,
                      a = this.strm,
                      c = this.options.chunkSize;
                    if (this.ended) return !1;
                    ((o = e === ~~e ? e : !0 === e ? 4 : 0),
                      "string" == typeof t
                        ? (a.input = s.string2buf(t))
                        : "[object ArrayBuffer]" === u.call(t)
                          ? (a.input = new Uint8Array(t))
                          : (a.input = t),
                      (a.next_in = 0),
                      (a.avail_in = a.input.length));
                    do {
                      if (
                        (0 === a.avail_out &&
                          ((a.output = new r.Buf8(c)),
                          (a.next_out = 0),
                          (a.avail_out = c)),
                        1 !== (i = n.deflate(a, o)) && 0 !== i)
                      )
                        return (this.onEnd(i), !(this.ended = !0));
                      (0 !== a.avail_out &&
                        (0 !== a.avail_in || (4 !== o && 2 !== o))) ||
                        ("string" === this.options.to
                          ? this.onData(
                              s.buf2binstring(
                                r.shrinkBuf(a.output, a.next_out),
                              ),
                            )
                          : this.onData(r.shrinkBuf(a.output, a.next_out)));
                    } while ((0 < a.avail_in || 0 === a.avail_out) && 1 !== i);
                    return 4 === o
                      ? ((i = n.deflateEnd(this.strm)),
                        this.onEnd(i),
                        (this.ended = !0),
                        0 === i)
                      : 2 !== o || (this.onEnd(0), !(a.avail_out = 0));
                  }),
                    (h.prototype.onData = function (t) {
                      this.chunks.push(t);
                    }),
                    (h.prototype.onEnd = function (t) {
                      (0 === t &&
                        ("string" === this.options.to
                          ? (this.result = this.chunks.join(""))
                          : (this.result = r.flattenChunks(this.chunks))),
                        (this.chunks = []),
                        (this.err = t),
                        (this.msg = this.strm.msg));
                    }),
                    (i.Deflate = h),
                    (i.deflate = m),
                    (i.deflateRaw = function (t, e) {
                      return (((e = e || {}).raw = !0), m(t, e));
                    }),
                    (i.gzip = function (t, e) {
                      return (((e = e || {}).gzip = !0), m(t, e));
                    }));
                },
                {
                  "./utils/common": 41,
                  "./utils/strings": 42,
                  "./zlib/deflate": 46,
                  "./zlib/messages": 51,
                  "./zlib/zstream": 53,
                },
              ],
              40: [
                function (t, e, i) {
                  var n = t("./zlib/inflate"),
                    r = t("./utils/common"),
                    s = t("./utils/strings"),
                    o = t("./zlib/constants"),
                    a = t("./zlib/messages"),
                    u = t("./zlib/zstream"),
                    c = t("./zlib/gzheader"),
                    l = Object.prototype.toString;
                  function f(t) {
                    if (!(this instanceof f)) return new f(t);
                    this.options = r.assign(
                      { chunkSize: 16384, windowBits: 0, to: "" },
                      t || {},
                    );
                    var e = this.options;
                    (e.raw &&
                      0 <= e.windowBits &&
                      e.windowBits < 16 &&
                      ((e.windowBits = -e.windowBits),
                      0 === e.windowBits && (e.windowBits = -15)),
                      !(0 <= e.windowBits && e.windowBits < 16) ||
                        (t && t.windowBits) ||
                        (e.windowBits += 32),
                      15 < e.windowBits &&
                        e.windowBits < 48 &&
                        !(15 & e.windowBits) &&
                        (e.windowBits |= 15),
                      (this.err = 0),
                      (this.msg = ""),
                      (this.ended = !1),
                      (this.chunks = []),
                      (this.strm = new u()),
                      (this.strm.avail_out = 0));
                    var i = n.inflateInit2(this.strm, e.windowBits);
                    if (i !== o.Z_OK) throw new Error(a[i]);
                    ((this.header = new c()),
                      n.inflateGetHeader(this.strm, this.header));
                  }
                  function d(t, e) {
                    var i = new f(e);
                    if ((i.push(t, !0), i.err)) throw i.msg || a[i.err];
                    return i.result;
                  }
                  ((f.prototype.push = function (t, e) {
                    var i,
                      a,
                      u,
                      c,
                      f,
                      d,
                      h = this.strm,
                      m = this.options.chunkSize,
                      v = this.options.dictionary,
                      p = !1;
                    if (this.ended) return !1;
                    ((a = e === ~~e ? e : !0 === e ? o.Z_FINISH : o.Z_NO_FLUSH),
                      "string" == typeof t
                        ? (h.input = s.binstring2buf(t))
                        : "[object ArrayBuffer]" === l.call(t)
                          ? (h.input = new Uint8Array(t))
                          : (h.input = t),
                      (h.next_in = 0),
                      (h.avail_in = h.input.length));
                    do {
                      if (
                        (0 === h.avail_out &&
                          ((h.output = new r.Buf8(m)),
                          (h.next_out = 0),
                          (h.avail_out = m)),
                        (i = n.inflate(h, o.Z_NO_FLUSH)) === o.Z_NEED_DICT &&
                          v &&
                          ((d =
                            "string" == typeof v
                              ? s.string2buf(v)
                              : "[object ArrayBuffer]" === l.call(v)
                                ? new Uint8Array(v)
                                : v),
                          (i = n.inflateSetDictionary(this.strm, d))),
                        i === o.Z_BUF_ERROR &&
                          !0 === p &&
                          ((i = o.Z_OK), (p = !1)),
                        i !== o.Z_STREAM_END && i !== o.Z_OK)
                      )
                        return (this.onEnd(i), !(this.ended = !0));
                      (h.next_out &&
                        ((0 !== h.avail_out &&
                          i !== o.Z_STREAM_END &&
                          (0 !== h.avail_in ||
                            (a !== o.Z_FINISH && a !== o.Z_SYNC_FLUSH))) ||
                          ("string" === this.options.to
                            ? ((u = s.utf8border(h.output, h.next_out)),
                              (c = h.next_out - u),
                              (f = s.buf2string(h.output, u)),
                              (h.next_out = c),
                              (h.avail_out = m - c),
                              c && r.arraySet(h.output, h.output, u, c, 0),
                              this.onData(f))
                            : this.onData(r.shrinkBuf(h.output, h.next_out)))),
                        0 === h.avail_in && 0 === h.avail_out && (p = !0));
                    } while (
                      (0 < h.avail_in || 0 === h.avail_out) &&
                      i !== o.Z_STREAM_END
                    );
                    return (
                      i === o.Z_STREAM_END && (a = o.Z_FINISH),
                      a === o.Z_FINISH
                        ? ((i = n.inflateEnd(this.strm)),
                          this.onEnd(i),
                          (this.ended = !0),
                          i === o.Z_OK)
                        : a !== o.Z_SYNC_FLUSH ||
                          (this.onEnd(o.Z_OK), !(h.avail_out = 0))
                    );
                  }),
                    (f.prototype.onData = function (t) {
                      this.chunks.push(t);
                    }),
                    (f.prototype.onEnd = function (t) {
                      (t === o.Z_OK &&
                        ("string" === this.options.to
                          ? (this.result = this.chunks.join(""))
                          : (this.result = r.flattenChunks(this.chunks))),
                        (this.chunks = []),
                        (this.err = t),
                        (this.msg = this.strm.msg));
                    }),
                    (i.Inflate = f),
                    (i.inflate = d),
                    (i.inflateRaw = function (t, e) {
                      return (((e = e || {}).raw = !0), d(t, e));
                    }),
                    (i.ungzip = d));
                },
                {
                  "./utils/common": 41,
                  "./utils/strings": 42,
                  "./zlib/constants": 44,
                  "./zlib/gzheader": 47,
                  "./zlib/inflate": 49,
                  "./zlib/messages": 51,
                  "./zlib/zstream": 53,
                },
              ],
              41: [
                function (t, e, i) {
                  var n =
                    "undefined" != typeof Uint8Array &&
                    "undefined" != typeof Uint16Array &&
                    "undefined" != typeof Int32Array;
                  ((i.assign = function (t) {
                    for (
                      var e = Array.prototype.slice.call(arguments, 1);
                      e.length;
                    ) {
                      var i = e.shift();
                      if (i) {
                        if ("object" != typeof i)
                          throw new TypeError(i + "must be non-object");
                        for (var n in i) i.hasOwnProperty(n) && (t[n] = i[n]);
                      }
                    }
                    return t;
                  }),
                    (i.shrinkBuf = function (t, e) {
                      return t.length === e
                        ? t
                        : t.subarray
                          ? t.subarray(0, e)
                          : ((t.length = e), t);
                    }));
                  var r = {
                      arraySet: function (t, e, i, n, r) {
                        if (e.subarray && t.subarray)
                          t.set(e.subarray(i, i + n), r);
                        else for (var s = 0; s < n; s++) t[r + s] = e[i + s];
                      },
                      flattenChunks: function (t) {
                        var e, i, n, r, s, o;
                        for (e = n = 0, i = t.length; e < i; e++)
                          n += t[e].length;
                        for (
                          o = new Uint8Array(n), e = r = 0, i = t.length;
                          e < i;
                          e++
                        )
                          ((s = t[e]), o.set(s, r), (r += s.length));
                        return o;
                      },
                    },
                    s = {
                      arraySet: function (t, e, i, n, r) {
                        for (var s = 0; s < n; s++) t[r + s] = e[i + s];
                      },
                      flattenChunks: function (t) {
                        return [].concat.apply([], t);
                      },
                    };
                  ((i.setTyped = function (t) {
                    t
                      ? ((i.Buf8 = Uint8Array),
                        (i.Buf16 = Uint16Array),
                        (i.Buf32 = Int32Array),
                        i.assign(i, r))
                      : ((i.Buf8 = Array),
                        (i.Buf16 = Array),
                        (i.Buf32 = Array),
                        i.assign(i, s));
                  }),
                    i.setTyped(n));
                },
                {},
              ],
              42: [
                function (t, e, i) {
                  var n = t("./common"),
                    r = !0,
                    s = !0;
                  try {
                    String.fromCharCode.apply(null, [0]);
                  } catch (t) {
                    r = !1;
                  }
                  try {
                    String.fromCharCode.apply(null, new Uint8Array(1));
                  } catch (t) {
                    s = !1;
                  }
                  for (var o = new n.Buf8(256), a = 0; a < 256; a++)
                    o[a] =
                      252 <= a
                        ? 6
                        : 248 <= a
                          ? 5
                          : 240 <= a
                            ? 4
                            : 224 <= a
                              ? 3
                              : 192 <= a
                                ? 2
                                : 1;
                  function u(t, e) {
                    if (e < 65537 && ((t.subarray && s) || (!t.subarray && r)))
                      return String.fromCharCode.apply(null, n.shrinkBuf(t, e));
                    for (var i = "", o = 0; o < e; o++)
                      i += String.fromCharCode(t[o]);
                    return i;
                  }
                  ((o[254] = o[254] = 1),
                    (i.string2buf = function (t) {
                      var e,
                        i,
                        r,
                        s,
                        o,
                        a = t.length,
                        u = 0;
                      for (s = 0; s < a; s++)
                        (55296 == (64512 & (i = t.charCodeAt(s))) &&
                          s + 1 < a &&
                          56320 == (64512 & (r = t.charCodeAt(s + 1))) &&
                          ((i = 65536 + ((i - 55296) << 10) + (r - 56320)),
                          s++),
                          (u +=
                            i < 128 ? 1 : i < 2048 ? 2 : i < 65536 ? 3 : 4));
                      for (e = new n.Buf8(u), s = o = 0; o < u; s++)
                        (55296 == (64512 & (i = t.charCodeAt(s))) &&
                          s + 1 < a &&
                          56320 == (64512 & (r = t.charCodeAt(s + 1))) &&
                          ((i = 65536 + ((i - 55296) << 10) + (r - 56320)),
                          s++),
                          i < 128
                            ? (e[o++] = i)
                            : (i < 2048
                                ? (e[o++] = 192 | (i >>> 6))
                                : (i < 65536
                                    ? (e[o++] = 224 | (i >>> 12))
                                    : ((e[o++] = 240 | (i >>> 18)),
                                      (e[o++] = 128 | ((i >>> 12) & 63))),
                                  (e[o++] = 128 | ((i >>> 6) & 63))),
                              (e[o++] = 128 | (63 & i))));
                      return e;
                    }),
                    (i.buf2binstring = function (t) {
                      return u(t, t.length);
                    }),
                    (i.binstring2buf = function (t) {
                      for (
                        var e = new n.Buf8(t.length), i = 0, r = e.length;
                        i < r;
                        i++
                      )
                        e[i] = t.charCodeAt(i);
                      return e;
                    }),
                    (i.buf2string = function (t, e) {
                      var i,
                        n,
                        r,
                        s,
                        a = e || t.length,
                        c = new Array(2 * a);
                      for (i = n = 0; i < a; )
                        if ((r = t[i++]) < 128) c[n++] = r;
                        else if (4 < (s = o[r]))
                          ((c[n++] = 65533), (i += s - 1));
                        else {
                          for (
                            r &= 2 === s ? 31 : 3 === s ? 15 : 7;
                            1 < s && i < a;
                          )
                            ((r = (r << 6) | (63 & t[i++])), s--);
                          1 < s
                            ? (c[n++] = 65533)
                            : r < 65536
                              ? (c[n++] = r)
                              : ((r -= 65536),
                                (c[n++] = 55296 | ((r >> 10) & 1023)),
                                (c[n++] = 56320 | (1023 & r)));
                        }
                      return u(c, n);
                    }),
                    (i.utf8border = function (t, e) {
                      var i;
                      for (
                        (e = e || t.length) > t.length && (e = t.length),
                          i = e - 1;
                        0 <= i && 128 == (192 & t[i]);
                      )
                        i--;
                      return i < 0 || 0 === i ? e : i + o[t[i]] > e ? i : e;
                    }));
                },
                { "./common": 41 },
              ],
              43: [
                function (t, e, i) {
                  e.exports = function (t, e, i, n) {
                    for (
                      var r = 65535 & t, s = (t >>> 16) & 65535, o = 0;
                      0 !== i;
                    ) {
                      for (
                        i -= o = 2e3 < i ? 2e3 : i;
                        (s = (s + (r = (r + e[n++]) | 0)) | 0), --o;
                      );
                      ((r %= 65521), (s %= 65521));
                    }
                    return r | (s << 16);
                  };
                },
                {},
              ],
              44: [
                function (t, e, i) {
                  e.exports = {
                    Z_NO_FLUSH: 0,
                    Z_PARTIAL_FLUSH: 1,
                    Z_SYNC_FLUSH: 2,
                    Z_FULL_FLUSH: 3,
                    Z_FINISH: 4,
                    Z_BLOCK: 5,
                    Z_TREES: 6,
                    Z_OK: 0,
                    Z_STREAM_END: 1,
                    Z_NEED_DICT: 2,
                    Z_ERRNO: -1,
                    Z_STREAM_ERROR: -2,
                    Z_DATA_ERROR: -3,
                    Z_BUF_ERROR: -5,
                    Z_NO_COMPRESSION: 0,
                    Z_BEST_SPEED: 1,
                    Z_BEST_COMPRESSION: 9,
                    Z_DEFAULT_COMPRESSION: -1,
                    Z_FILTERED: 1,
                    Z_HUFFMAN_ONLY: 2,
                    Z_RLE: 3,
                    Z_FIXED: 4,
                    Z_DEFAULT_STRATEGY: 0,
                    Z_BINARY: 0,
                    Z_TEXT: 1,
                    Z_UNKNOWN: 2,
                    Z_DEFLATED: 8,
                  };
                },
                {},
              ],
              45: [
                function (t, e, i) {
                  var n = (function () {
                    for (var t, e = [], i = 0; i < 256; i++) {
                      t = i;
                      for (var n = 0; n < 8; n++)
                        t = 1 & t ? 3988292384 ^ (t >>> 1) : t >>> 1;
                      e[i] = t;
                    }
                    return e;
                  })();
                  e.exports = function (t, e, i, r) {
                    var s = n,
                      o = r + i;
                    t ^= -1;
                    for (var a = r; a < o; a++)
                      t = (t >>> 8) ^ s[255 & (t ^ e[a])];
                    return ~t;
                  };
                },
                {},
              ],
              46: [
                function (t, e, i) {
                  var n,
                    r = t("../utils/common"),
                    s = t("./trees"),
                    o = t("./adler32"),
                    a = t("./crc32"),
                    u = t("./messages"),
                    c = 0,
                    l = 4,
                    f = 0,
                    d = -2,
                    h = -1,
                    m = 4,
                    v = 2,
                    p = 8,
                    _ = 9,
                    w = 286,
                    b = 30,
                    g = 19,
                    k = 573,
                    y = 15,
                    $ = 3,
                    x = 258,
                    E = 262,
                    T = 42,
                    P = 113,
                    I = 1,
                    A = 2,
                    S = 3,
                    N = 4;
                  function D(t, e) {
                    return ((t.msg = u[e]), e);
                  }
                  function U(t) {
                    return (t << 1) - (4 < t ? 9 : 0);
                  }
                  function C(t) {
                    for (var e = t.length; 0 <= --e; ) t[e] = 0;
                  }
                  function B(t) {
                    var e = t.state,
                      i = e.pending;
                    (i > t.avail_out && (i = t.avail_out),
                      0 !== i &&
                        (r.arraySet(
                          t.output,
                          e.pending_buf,
                          e.pending_out,
                          i,
                          t.next_out,
                        ),
                        (t.next_out += i),
                        (e.pending_out += i),
                        (t.total_out += i),
                        (t.avail_out -= i),
                        (e.pending -= i),
                        0 === e.pending && (e.pending_out = 0)));
                  }
                  function R(t, e) {
                    (s._tr_flush_block(
                      t,
                      0 <= t.block_start ? t.block_start : -1,
                      t.strstart - t.block_start,
                      e,
                    ),
                      (t.block_start = t.strstart),
                      B(t.strm));
                  }
                  function z(t, e) {
                    t.pending_buf[t.pending++] = e;
                  }
                  function F(t, e) {
                    ((t.pending_buf[t.pending++] = (e >>> 8) & 255),
                      (t.pending_buf[t.pending++] = 255 & e));
                  }
                  function O(t, e) {
                    var i,
                      n,
                      r = t.max_chain_length,
                      s = t.strstart,
                      o = t.prev_length,
                      a = t.nice_match,
                      u =
                        t.strstart > t.w_size - E
                          ? t.strstart - (t.w_size - E)
                          : 0,
                      c = t.window,
                      l = t.w_mask,
                      f = t.prev,
                      d = t.strstart + x,
                      h = c[s + o - 1],
                      m = c[s + o];
                    (t.prev_length >= t.good_match && (r >>= 2),
                      a > t.lookahead && (a = t.lookahead));
                    do {
                      if (
                        c[(i = e) + o] === m &&
                        c[i + o - 1] === h &&
                        c[i] === c[s] &&
                        c[++i] === c[s + 1]
                      ) {
                        ((s += 2), i++);
                        do {} while (
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          c[++s] === c[++i] &&
                          s < d
                        );
                        if (((n = x - (d - s)), (s = d - x), o < n)) {
                          if (((t.match_start = e), a <= (o = n))) break;
                          ((h = c[s + o - 1]), (m = c[s + o]));
                        }
                      }
                    } while ((e = f[e & l]) > u && 0 != --r);
                    return o <= t.lookahead ? o : t.lookahead;
                  }
                  function L(t) {
                    var e,
                      i,
                      n,
                      s,
                      u,
                      c,
                      l,
                      f,
                      d,
                      h,
                      m = t.w_size;
                    do {
                      if (
                        ((s = t.window_size - t.lookahead - t.strstart),
                        t.strstart >= m + (m - E))
                      ) {
                        for (
                          r.arraySet(t.window, t.window, m, m, 0),
                            t.match_start -= m,
                            t.strstart -= m,
                            t.block_start -= m,
                            e = i = t.hash_size;
                          (n = t.head[--e]),
                            (t.head[e] = m <= n ? n - m : 0),
                            --i;
                        );
                        for (
                          e = i = m;
                          (n = t.prev[--e]),
                            (t.prev[e] = m <= n ? n - m : 0),
                            --i;
                        );
                        s += m;
                      }
                      if (0 === t.strm.avail_in) break;
                      if (
                        ((c = t.strm),
                        (l = t.window),
                        (f = t.strstart + t.lookahead),
                        (h = void 0),
                        (d = s) < (h = c.avail_in) && (h = d),
                        (i =
                          0 === h
                            ? 0
                            : ((c.avail_in -= h),
                              r.arraySet(l, c.input, c.next_in, h, f),
                              1 === c.state.wrap
                                ? (c.adler = o(c.adler, l, h, f))
                                : 2 === c.state.wrap &&
                                  (c.adler = a(c.adler, l, h, f)),
                              (c.next_in += h),
                              (c.total_in += h),
                              h)),
                        (t.lookahead += i),
                        t.lookahead + t.insert >= 3)
                      )
                        for (
                          u = t.strstart - t.insert,
                            t.ins_h = t.window[u],
                            t.ins_h =
                              ((t.ins_h << t.hash_shift) ^ t.window[u + 1]) &
                              t.hash_mask;
                          t.insert &&
                          ((t.ins_h =
                            ((t.ins_h << t.hash_shift) ^ t.window[u + 3 - 1]) &
                            t.hash_mask),
                          (t.prev[u & t.w_mask] = t.head[t.ins_h]),
                          (t.head[t.ins_h] = u),
                          u++,
                          t.insert--,
                          !(t.lookahead + t.insert < 3));
                        );
                    } while (t.lookahead < E && 0 !== t.strm.avail_in);
                  }
                  function M(t, e) {
                    for (var i, n; ; ) {
                      if (t.lookahead < E) {
                        if ((L(t), t.lookahead < E && 0 === e)) return 1;
                        if (0 === t.lookahead) break;
                      }
                      if (
                        ((i = 0),
                        t.lookahead >= 3 &&
                          ((t.ins_h =
                            ((t.ins_h << t.hash_shift) ^
                              t.window[t.strstart + 3 - 1]) &
                            t.hash_mask),
                          (i = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h]),
                          (t.head[t.ins_h] = t.strstart)),
                        0 !== i &&
                          t.strstart - i <= t.w_size - E &&
                          (t.match_length = O(t, i)),
                        t.match_length >= 3)
                      )
                        if (
                          ((n = s._tr_tally(
                            t,
                            t.strstart - t.match_start,
                            t.match_length - 3,
                          )),
                          (t.lookahead -= t.match_length),
                          t.match_length <= t.max_lazy_match &&
                            t.lookahead >= 3)
                        ) {
                          for (
                            t.match_length--;
                            t.strstart++,
                              (t.ins_h =
                                ((t.ins_h << t.hash_shift) ^
                                  t.window[t.strstart + 3 - 1]) &
                                t.hash_mask),
                              (i = t.prev[t.strstart & t.w_mask] =
                                t.head[t.ins_h]),
                              (t.head[t.ins_h] = t.strstart),
                              0 != --t.match_length;
                          );
                          t.strstart++;
                        } else
                          ((t.strstart += t.match_length),
                            (t.match_length = 0),
                            (t.ins_h = t.window[t.strstart]),
                            (t.ins_h =
                              ((t.ins_h << t.hash_shift) ^
                                t.window[t.strstart + 1]) &
                              t.hash_mask));
                      else
                        ((n = s._tr_tally(t, 0, t.window[t.strstart])),
                          t.lookahead--,
                          t.strstart++);
                      if (n && (R(t, !1), 0 === t.strm.avail_out)) return 1;
                    }
                    return (
                      (t.insert = t.strstart < 2 ? t.strstart : 2),
                      4 === e
                        ? (R(t, !0), 0 === t.strm.avail_out ? 3 : 4)
                        : t.last_lit && (R(t, !1), 0 === t.strm.avail_out)
                          ? 1
                          : 2
                    );
                  }
                  function W(t, e) {
                    for (var i, n, r; ; ) {
                      if (t.lookahead < E) {
                        if ((L(t), t.lookahead < E && 0 === e)) return 1;
                        if (0 === t.lookahead) break;
                      }
                      if (
                        ((i = 0),
                        t.lookahead >= 3 &&
                          ((t.ins_h =
                            ((t.ins_h << t.hash_shift) ^
                              t.window[t.strstart + 3 - 1]) &
                            t.hash_mask),
                          (i = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h]),
                          (t.head[t.ins_h] = t.strstart)),
                        (t.prev_length = t.match_length),
                        (t.prev_match = t.match_start),
                        (t.match_length = 2),
                        0 !== i &&
                          t.prev_length < t.max_lazy_match &&
                          t.strstart - i <= t.w_size - E &&
                          ((t.match_length = O(t, i)),
                          t.match_length <= 5 &&
                            (1 === t.strategy ||
                              (3 === t.match_length &&
                                4096 < t.strstart - t.match_start)) &&
                            (t.match_length = 2)),
                        t.prev_length >= 3 && t.match_length <= t.prev_length)
                      ) {
                        for (
                          r = t.strstart + t.lookahead - 3,
                            n = s._tr_tally(
                              t,
                              t.strstart - 1 - t.prev_match,
                              t.prev_length - 3,
                            ),
                            t.lookahead -= t.prev_length - 1,
                            t.prev_length -= 2;
                          ++t.strstart <= r &&
                            ((t.ins_h =
                              ((t.ins_h << t.hash_shift) ^
                                t.window[t.strstart + 3 - 1]) &
                              t.hash_mask),
                            (i = t.prev[t.strstart & t.w_mask] =
                              t.head[t.ins_h]),
                            (t.head[t.ins_h] = t.strstart)),
                            0 != --t.prev_length;
                        );
                        if (
                          ((t.match_available = 0),
                          (t.match_length = 2),
                          t.strstart++,
                          n && (R(t, !1), 0 === t.strm.avail_out))
                        )
                          return 1;
                      } else if (t.match_available) {
                        if (
                          ((n = s._tr_tally(t, 0, t.window[t.strstart - 1])) &&
                            R(t, !1),
                          t.strstart++,
                          t.lookahead--,
                          0 === t.strm.avail_out)
                        )
                          return 1;
                      } else
                        ((t.match_available = 1), t.strstart++, t.lookahead--);
                    }
                    return (
                      t.match_available &&
                        ((n = s._tr_tally(t, 0, t.window[t.strstart - 1])),
                        (t.match_available = 0)),
                      (t.insert = t.strstart < 2 ? t.strstart : 2),
                      4 === e
                        ? (R(t, !0), 0 === t.strm.avail_out ? 3 : 4)
                        : t.last_lit && (R(t, !1), 0 === t.strm.avail_out)
                          ? 1
                          : 2
                    );
                  }
                  function j(t, e, i, n, r) {
                    ((this.good_length = t),
                      (this.max_lazy = e),
                      (this.nice_length = i),
                      (this.max_chain = n),
                      (this.func = r));
                  }
                  function Z() {
                    ((this.strm = null),
                      (this.status = 0),
                      (this.pending_buf = null),
                      (this.pending_buf_size = 0),
                      (this.pending_out = 0),
                      (this.pending = 0),
                      (this.wrap = 0),
                      (this.gzhead = null),
                      (this.gzindex = 0),
                      (this.method = 8),
                      (this.last_flush = -1),
                      (this.w_size = 0),
                      (this.w_bits = 0),
                      (this.w_mask = 0),
                      (this.window = null),
                      (this.window_size = 0),
                      (this.prev = null),
                      (this.head = null),
                      (this.ins_h = 0),
                      (this.hash_size = 0),
                      (this.hash_bits = 0),
                      (this.hash_mask = 0),
                      (this.hash_shift = 0),
                      (this.block_start = 0),
                      (this.match_length = 0),
                      (this.prev_match = 0),
                      (this.match_available = 0),
                      (this.strstart = 0),
                      (this.match_start = 0),
                      (this.lookahead = 0),
                      (this.prev_length = 0),
                      (this.max_chain_length = 0),
                      (this.max_lazy_match = 0),
                      (this.level = 0),
                      (this.strategy = 0),
                      (this.good_match = 0),
                      (this.nice_match = 0),
                      (this.dyn_ltree = new r.Buf16(2 * k)),
                      (this.dyn_dtree = new r.Buf16(122)),
                      (this.bl_tree = new r.Buf16(78)),
                      C(this.dyn_ltree),
                      C(this.dyn_dtree),
                      C(this.bl_tree),
                      (this.l_desc = null),
                      (this.d_desc = null),
                      (this.bl_desc = null),
                      (this.bl_count = new r.Buf16(16)),
                      (this.heap = new r.Buf16(573)),
                      C(this.heap),
                      (this.heap_len = 0),
                      (this.heap_max = 0),
                      (this.depth = new r.Buf16(573)),
                      C(this.depth),
                      (this.l_buf = 0),
                      (this.lit_bufsize = 0),
                      (this.last_lit = 0),
                      (this.d_buf = 0),
                      (this.opt_len = 0),
                      (this.static_len = 0),
                      (this.matches = 0),
                      (this.insert = 0),
                      (this.bi_buf = 0),
                      (this.bi_valid = 0));
                  }
                  function G(t) {
                    var e;
                    return t && t.state
                      ? ((t.total_in = t.total_out = 0),
                        (t.data_type = 2),
                        ((e = t.state).pending = 0),
                        (e.pending_out = 0),
                        e.wrap < 0 && (e.wrap = -e.wrap),
                        (e.status = e.wrap ? T : P),
                        (t.adler = 2 === e.wrap ? 0 : 1),
                        (e.last_flush = 0),
                        s._tr_init(e),
                        0)
                      : D(t, d);
                  }
                  function H(t) {
                    var e = G(t);
                    return (
                      0 === e &&
                        (function (t) {
                          ((t.window_size = 2 * t.w_size),
                            C(t.head),
                            (t.max_lazy_match = n[t.level].max_lazy),
                            (t.good_match = n[t.level].good_length),
                            (t.nice_match = n[t.level].nice_length),
                            (t.max_chain_length = n[t.level].max_chain),
                            (t.strstart = 0),
                            (t.block_start = 0),
                            (t.lookahead = 0),
                            (t.insert = 0),
                            (t.match_length = t.prev_length = 2),
                            (t.match_available = 0),
                            (t.ins_h = 0));
                        })(t.state),
                      e
                    );
                  }
                  function K(t, e, i, n, s, o) {
                    if (!t) return d;
                    var a = 1;
                    if (
                      (e === h && (e = 6),
                      n < 0
                        ? ((a = 0), (n = -n))
                        : 15 < n && ((a = 2), (n -= 16)),
                      s < 1 ||
                        9 < s ||
                        8 !== i ||
                        n < 8 ||
                        15 < n ||
                        e < 0 ||
                        9 < e ||
                        o < 0 ||
                        4 < o)
                    )
                      return D(t, d);
                    8 === n && (n = 9);
                    var u = new Z();
                    return (
                      ((t.state = u).strm = t),
                      (u.wrap = a),
                      (u.gzhead = null),
                      (u.w_bits = n),
                      (u.w_size = 1 << u.w_bits),
                      (u.w_mask = u.w_size - 1),
                      (u.hash_bits = s + 7),
                      (u.hash_size = 1 << u.hash_bits),
                      (u.hash_mask = u.hash_size - 1),
                      (u.hash_shift = ~~((u.hash_bits + 3 - 1) / 3)),
                      (u.window = new r.Buf8(2 * u.w_size)),
                      (u.head = new r.Buf16(u.hash_size)),
                      (u.prev = new r.Buf16(u.w_size)),
                      (u.lit_bufsize = 1 << (s + 6)),
                      (u.pending_buf_size = 4 * u.lit_bufsize),
                      (u.pending_buf = new r.Buf8(u.pending_buf_size)),
                      (u.d_buf = 1 * u.lit_bufsize),
                      (u.l_buf = 3 * u.lit_bufsize),
                      (u.level = e),
                      (u.strategy = o),
                      (u.method = i),
                      H(t)
                    );
                  }
                  ((n = [
                    new j(0, 0, 0, 0, function (t, e) {
                      var i = 65535;
                      for (
                        i > t.pending_buf_size - 5 &&
                        (i = t.pending_buf_size - 5);
                        ;
                      ) {
                        if (t.lookahead <= 1) {
                          if ((L(t), 0 === t.lookahead && 0 === e)) return 1;
                          if (0 === t.lookahead) break;
                        }
                        ((t.strstart += t.lookahead), (t.lookahead = 0));
                        var n = t.block_start + i;
                        if (
                          (0 === t.strstart || t.strstart >= n) &&
                          ((t.lookahead = t.strstart - n),
                          (t.strstart = n),
                          R(t, !1),
                          0 === t.strm.avail_out)
                        )
                          return 1;
                        if (
                          t.strstart - t.block_start >= t.w_size - E &&
                          (R(t, !1), 0 === t.strm.avail_out)
                        )
                          return 1;
                      }
                      return (
                        (t.insert = 0),
                        4 === e
                          ? (R(t, !0), 0 === t.strm.avail_out ? 3 : 4)
                          : (t.strstart > t.block_start &&
                              (R(t, !1), t.strm.avail_out),
                            1)
                      );
                    }),
                    new j(4, 4, 8, 4, M),
                    new j(4, 5, 16, 8, M),
                    new j(4, 6, 32, 32, M),
                    new j(4, 4, 16, 16, W),
                    new j(8, 16, 32, 32, W),
                    new j(8, 16, 128, 128, W),
                    new j(8, 32, 128, 256, W),
                    new j(32, 128, 258, 1024, W),
                    new j(32, 258, 258, 4096, W),
                  ]),
                    (i.deflateInit = function (t, e) {
                      return K(t, e, 8, 15, 8, 0);
                    }),
                    (i.deflateInit2 = K),
                    (i.deflateReset = H),
                    (i.deflateResetKeep = G),
                    (i.deflateSetHeader = function (t, e) {
                      return t && t.state
                        ? 2 !== t.state.wrap
                          ? d
                          : ((t.state.gzhead = e), 0)
                        : d;
                    }),
                    (i.deflate = function (t, e) {
                      var i, r, o, u;
                      if (!t || !t.state || 5 < e || e < 0)
                        return t ? D(t, d) : d;
                      if (
                        ((r = t.state),
                        !t.output ||
                          (!t.input && 0 !== t.avail_in) ||
                          (666 === r.status && 4 !== e))
                      )
                        return D(t, 0 === t.avail_out ? -5 : d);
                      if (
                        ((r.strm = t),
                        (i = r.last_flush),
                        (r.last_flush = e),
                        r.status === T)
                      )
                        if (2 === r.wrap)
                          ((t.adler = 0),
                            z(r, 31),
                            z(r, 139),
                            z(r, 8),
                            r.gzhead
                              ? (z(
                                  r,
                                  (r.gzhead.text ? 1 : 0) +
                                    (r.gzhead.hcrc ? 2 : 0) +
                                    (r.gzhead.extra ? 4 : 0) +
                                    (r.gzhead.name ? 8 : 0) +
                                    (r.gzhead.comment ? 16 : 0),
                                ),
                                z(r, 255 & r.gzhead.time),
                                z(r, (r.gzhead.time >> 8) & 255),
                                z(r, (r.gzhead.time >> 16) & 255),
                                z(r, (r.gzhead.time >> 24) & 255),
                                z(
                                  r,
                                  9 === r.level
                                    ? 2
                                    : 2 <= r.strategy || r.level < 2
                                      ? 4
                                      : 0,
                                ),
                                z(r, 255 & r.gzhead.os),
                                r.gzhead.extra &&
                                  r.gzhead.extra.length &&
                                  (z(r, 255 & r.gzhead.extra.length),
                                  z(r, (r.gzhead.extra.length >> 8) & 255)),
                                r.gzhead.hcrc &&
                                  (t.adler = a(
                                    t.adler,
                                    r.pending_buf,
                                    r.pending,
                                    0,
                                  )),
                                (r.gzindex = 0),
                                (r.status = 69))
                              : (z(r, 0),
                                z(r, 0),
                                z(r, 0),
                                z(r, 0),
                                z(r, 0),
                                z(
                                  r,
                                  9 === r.level
                                    ? 2
                                    : 2 <= r.strategy || r.level < 2
                                      ? 4
                                      : 0,
                                ),
                                z(r, 3),
                                (r.status = P)));
                        else {
                          var c = (8 + ((r.w_bits - 8) << 4)) << 8;
                          ((c |=
                            (2 <= r.strategy || r.level < 2
                              ? 0
                              : r.level < 6
                                ? 1
                                : 6 === r.level
                                  ? 2
                                  : 3) << 6),
                            0 !== r.strstart && (c |= 32),
                            (c += 31 - (c % 31)),
                            (r.status = P),
                            F(r, c),
                            0 !== r.strstart &&
                              (F(r, t.adler >>> 16), F(r, 65535 & t.adler)),
                            (t.adler = 1));
                        }
                      if (69 === r.status)
                        if (r.gzhead.extra) {
                          for (
                            o = r.pending;
                            r.gzindex < (65535 & r.gzhead.extra.length) &&
                            (r.pending !== r.pending_buf_size ||
                              (r.gzhead.hcrc &&
                                r.pending > o &&
                                (t.adler = a(
                                  t.adler,
                                  r.pending_buf,
                                  r.pending - o,
                                  o,
                                )),
                              B(t),
                              (o = r.pending),
                              r.pending !== r.pending_buf_size));
                          )
                            (z(r, 255 & r.gzhead.extra[r.gzindex]),
                              r.gzindex++);
                          (r.gzhead.hcrc &&
                            r.pending > o &&
                            (t.adler = a(
                              t.adler,
                              r.pending_buf,
                              r.pending - o,
                              o,
                            )),
                            r.gzindex === r.gzhead.extra.length &&
                              ((r.gzindex = 0), (r.status = 73)));
                        } else r.status = 73;
                      if (73 === r.status)
                        if (r.gzhead.name) {
                          o = r.pending;
                          do {
                            if (
                              r.pending === r.pending_buf_size &&
                              (r.gzhead.hcrc &&
                                r.pending > o &&
                                (t.adler = a(
                                  t.adler,
                                  r.pending_buf,
                                  r.pending - o,
                                  o,
                                )),
                              B(t),
                              (o = r.pending),
                              r.pending === r.pending_buf_size)
                            ) {
                              u = 1;
                              break;
                            }
                            ((u =
                              r.gzindex < r.gzhead.name.length
                                ? 255 & r.gzhead.name.charCodeAt(r.gzindex++)
                                : 0),
                              z(r, u));
                          } while (0 !== u);
                          (r.gzhead.hcrc &&
                            r.pending > o &&
                            (t.adler = a(
                              t.adler,
                              r.pending_buf,
                              r.pending - o,
                              o,
                            )),
                            0 === u && ((r.gzindex = 0), (r.status = 91)));
                        } else r.status = 91;
                      if (91 === r.status)
                        if (r.gzhead.comment) {
                          o = r.pending;
                          do {
                            if (
                              r.pending === r.pending_buf_size &&
                              (r.gzhead.hcrc &&
                                r.pending > o &&
                                (t.adler = a(
                                  t.adler,
                                  r.pending_buf,
                                  r.pending - o,
                                  o,
                                )),
                              B(t),
                              (o = r.pending),
                              r.pending === r.pending_buf_size)
                            ) {
                              u = 1;
                              break;
                            }
                            ((u =
                              r.gzindex < r.gzhead.comment.length
                                ? 255 & r.gzhead.comment.charCodeAt(r.gzindex++)
                                : 0),
                              z(r, u));
                          } while (0 !== u);
                          (r.gzhead.hcrc &&
                            r.pending > o &&
                            (t.adler = a(
                              t.adler,
                              r.pending_buf,
                              r.pending - o,
                              o,
                            )),
                            0 === u && (r.status = 103));
                        } else r.status = 103;
                      if (
                        (103 === r.status &&
                          (r.gzhead.hcrc
                            ? (r.pending + 2 > r.pending_buf_size && B(t),
                              r.pending + 2 <= r.pending_buf_size &&
                                (z(r, 255 & t.adler),
                                z(r, (t.adler >> 8) & 255),
                                (t.adler = 0),
                                (r.status = P)))
                            : (r.status = P)),
                        0 !== r.pending)
                      ) {
                        if ((B(t), 0 === t.avail_out))
                          return ((r.last_flush = -1), 0);
                      } else if (0 === t.avail_in && U(e) <= U(i) && 4 !== e)
                        return D(t, -5);
                      if (666 === r.status && 0 !== t.avail_in) return D(t, -5);
                      if (
                        0 !== t.avail_in ||
                        0 !== r.lookahead ||
                        (0 !== e && 666 !== r.status)
                      ) {
                        var l =
                          2 === r.strategy
                            ? (function (t, e) {
                                for (var i; ; ) {
                                  if (
                                    0 === t.lookahead &&
                                    (L(t), 0 === t.lookahead)
                                  ) {
                                    if (0 === e) return 1;
                                    break;
                                  }
                                  if (
                                    ((t.match_length = 0),
                                    (i = s._tr_tally(
                                      t,
                                      0,
                                      t.window[t.strstart],
                                    )),
                                    t.lookahead--,
                                    t.strstart++,
                                    i && (R(t, !1), 0 === t.strm.avail_out))
                                  )
                                    return 1;
                                }
                                return (
                                  (t.insert = 0),
                                  4 === e
                                    ? (R(t, !0), 0 === t.strm.avail_out ? 3 : 4)
                                    : t.last_lit &&
                                        (R(t, !1), 0 === t.strm.avail_out)
                                      ? 1
                                      : 2
                                );
                              })(r, e)
                            : 3 === r.strategy
                              ? (function (t, e) {
                                  for (var i, n, r, o, a = t.window; ; ) {
                                    if (t.lookahead <= x) {
                                      if ((L(t), t.lookahead <= x && 0 === e))
                                        return 1;
                                      if (0 === t.lookahead) break;
                                    }
                                    if (
                                      ((t.match_length = 0),
                                      t.lookahead >= 3 &&
                                        0 < t.strstart &&
                                        (n = a[(r = t.strstart - 1)]) ===
                                          a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r])
                                    ) {
                                      o = t.strstart + x;
                                      do {} while (
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        n === a[++r] &&
                                        r < o
                                      );
                                      ((t.match_length = x - (o - r)),
                                        t.match_length > t.lookahead &&
                                          (t.match_length = t.lookahead));
                                    }
                                    if (
                                      (t.match_length >= 3
                                        ? ((i = s._tr_tally(
                                            t,
                                            1,
                                            t.match_length - 3,
                                          )),
                                          (t.lookahead -= t.match_length),
                                          (t.strstart += t.match_length),
                                          (t.match_length = 0))
                                        : ((i = s._tr_tally(
                                            t,
                                            0,
                                            t.window[t.strstart],
                                          )),
                                          t.lookahead--,
                                          t.strstart++),
                                      i && (R(t, !1), 0 === t.strm.avail_out))
                                    )
                                      return 1;
                                  }
                                  return (
                                    (t.insert = 0),
                                    4 === e
                                      ? (R(t, !0),
                                        0 === t.strm.avail_out ? 3 : 4)
                                      : t.last_lit &&
                                          (R(t, !1), 0 === t.strm.avail_out)
                                        ? 1
                                        : 2
                                  );
                                })(r, e)
                              : n[r.level].func(r, e);
                        if (
                          ((3 !== l && 4 !== l) || (r.status = 666),
                          1 === l || 3 === l)
                        )
                          return (0 === t.avail_out && (r.last_flush = -1), 0);
                        if (
                          2 === l &&
                          (1 === e
                            ? s._tr_align(r)
                            : 5 !== e &&
                              (s._tr_stored_block(r, 0, 0, !1),
                              3 === e &&
                                (C(r.head),
                                0 === r.lookahead &&
                                  ((r.strstart = 0),
                                  (r.block_start = 0),
                                  (r.insert = 0)))),
                          B(t),
                          0 === t.avail_out)
                        )
                          return ((r.last_flush = -1), 0);
                      }
                      return 4 !== e
                        ? 0
                        : r.wrap <= 0
                          ? 1
                          : (2 === r.wrap
                              ? (z(r, 255 & t.adler),
                                z(r, (t.adler >> 8) & 255),
                                z(r, (t.adler >> 16) & 255),
                                z(r, (t.adler >> 24) & 255),
                                z(r, 255 & t.total_in),
                                z(r, (t.total_in >> 8) & 255),
                                z(r, (t.total_in >> 16) & 255),
                                z(r, (t.total_in >> 24) & 255))
                              : (F(r, t.adler >>> 16), F(r, 65535 & t.adler)),
                            B(t),
                            0 < r.wrap && (r.wrap = -r.wrap),
                            0 !== r.pending ? 0 : 1);
                    }),
                    (i.deflateEnd = function (t) {
                      var e;
                      return t && t.state
                        ? (e = t.state.status) !== T &&
                          69 !== e &&
                          73 !== e &&
                          91 !== e &&
                          103 !== e &&
                          e !== P &&
                          666 !== e
                          ? D(t, d)
                          : ((t.state = null), e === P ? D(t, -3) : 0)
                        : d;
                    }),
                    (i.deflateSetDictionary = function (t, e) {
                      var i,
                        n,
                        s,
                        a,
                        u,
                        c,
                        l,
                        f,
                        h = e.length;
                      if (!t || !t.state) return d;
                      if (
                        2 === (a = (i = t.state).wrap) ||
                        (1 === a && i.status !== T) ||
                        i.lookahead
                      )
                        return d;
                      for (
                        1 === a && (t.adler = o(t.adler, e, h, 0)),
                          i.wrap = 0,
                          h >= i.w_size &&
                            (0 === a &&
                              (C(i.head),
                              (i.strstart = 0),
                              (i.block_start = 0),
                              (i.insert = 0)),
                            (f = new r.Buf8(i.w_size)),
                            r.arraySet(f, e, h - i.w_size, i.w_size, 0),
                            (e = f),
                            (h = i.w_size)),
                          u = t.avail_in,
                          c = t.next_in,
                          l = t.input,
                          t.avail_in = h,
                          t.next_in = 0,
                          t.input = e,
                          L(i);
                        i.lookahead >= 3;
                      ) {
                        for (
                          n = i.strstart, s = i.lookahead - 2;
                          (i.ins_h =
                            ((i.ins_h << i.hash_shift) ^ i.window[n + 3 - 1]) &
                            i.hash_mask),
                            (i.prev[n & i.w_mask] = i.head[i.ins_h]),
                            (i.head[i.ins_h] = n),
                            n++,
                            --s;
                        );
                        ((i.strstart = n), (i.lookahead = 2), L(i));
                      }
                      return (
                        (i.strstart += i.lookahead),
                        (i.block_start = i.strstart),
                        (i.insert = i.lookahead),
                        (i.lookahead = 0),
                        (i.match_length = i.prev_length = 2),
                        (i.match_available = 0),
                        (t.next_in = c),
                        (t.input = l),
                        (t.avail_in = u),
                        (i.wrap = a),
                        0
                      );
                    }),
                    (i.deflateInfo = "pako deflate (from Nodeca project)"));
                },
                {
                  "../utils/common": 41,
                  "./adler32": 43,
                  "./crc32": 45,
                  "./messages": 51,
                  "./trees": 52,
                },
              ],
              47: [
                function (t, e, i) {
                  e.exports = function () {
                    ((this.text = 0),
                      (this.time = 0),
                      (this.xflags = 0),
                      (this.os = 0),
                      (this.extra = null),
                      (this.extra_len = 0),
                      (this.name = ""),
                      (this.comment = ""),
                      (this.hcrc = 0),
                      (this.done = !1));
                  };
                },
                {},
              ],
              48: [
                function (t, e, i) {
                  e.exports = function (t, e) {
                    var i,
                      n,
                      r,
                      s,
                      o,
                      a,
                      u,
                      c,
                      l,
                      f,
                      d,
                      h,
                      m,
                      v,
                      p,
                      _,
                      w,
                      b,
                      g,
                      k,
                      y,
                      $,
                      x,
                      E,
                      T;
                    ((i = t.state),
                      (n = t.next_in),
                      (E = t.input),
                      (r = n + (t.avail_in - 5)),
                      (s = t.next_out),
                      (T = t.output),
                      (o = s - (e - t.avail_out)),
                      (a = s + (t.avail_out - 257)),
                      (u = i.dmax),
                      (c = i.wsize),
                      (l = i.whave),
                      (f = i.wnext),
                      (d = i.window),
                      (h = i.hold),
                      (m = i.bits),
                      (v = i.lencode),
                      (p = i.distcode),
                      (_ = (1 << i.lenbits) - 1),
                      (w = (1 << i.distbits) - 1));
                    t: do {
                      (m < 15 &&
                        ((h += E[n++] << m),
                        (m += 8),
                        (h += E[n++] << m),
                        (m += 8)),
                        (b = v[h & _]));
                      e: for (;;) {
                        if (
                          ((h >>>= g = b >>> 24),
                          (m -= g),
                          0 == (g = (b >>> 16) & 255))
                        )
                          T[s++] = 65535 & b;
                        else {
                          if (!(16 & g)) {
                            if (!(64 & g)) {
                              b = v[(65535 & b) + (h & ((1 << g) - 1))];
                              continue e;
                            }
                            if (32 & g) {
                              i.mode = 12;
                              break t;
                            }
                            ((t.msg = "invalid literal/length code"),
                              (i.mode = 30));
                            break t;
                          }
                          ((k = 65535 & b),
                            (g &= 15) &&
                              (m < g && ((h += E[n++] << m), (m += 8)),
                              (k += h & ((1 << g) - 1)),
                              (h >>>= g),
                              (m -= g)),
                            m < 15 &&
                              ((h += E[n++] << m),
                              (m += 8),
                              (h += E[n++] << m),
                              (m += 8)),
                            (b = p[h & w]));
                          i: for (;;) {
                            if (
                              ((h >>>= g = b >>> 24),
                              (m -= g),
                              !(16 & (g = (b >>> 16) & 255)))
                            ) {
                              if (!(64 & g)) {
                                b = p[(65535 & b) + (h & ((1 << g) - 1))];
                                continue i;
                              }
                              ((t.msg = "invalid distance code"),
                                (i.mode = 30));
                              break t;
                            }
                            if (
                              ((y = 65535 & b),
                              m < (g &= 15) &&
                                ((h += E[n++] << m),
                                (m += 8) < g && ((h += E[n++] << m), (m += 8))),
                              u < (y += h & ((1 << g) - 1)))
                            ) {
                              ((t.msg = "invalid distance too far back"),
                                (i.mode = 30));
                              break t;
                            }
                            if (((h >>>= g), (m -= g), (g = s - o) < y)) {
                              if (l < (g = y - g) && i.sane) {
                                ((t.msg = "invalid distance too far back"),
                                  (i.mode = 30));
                                break t;
                              }
                              if (((x = d), ($ = 0) === f)) {
                                if ((($ += c - g), g < k)) {
                                  for (k -= g; (T[s++] = d[$++]), --g; );
                                  (($ = s - y), (x = T));
                                }
                              } else if (f < g) {
                                if ((($ += c + f - g), (g -= f) < k)) {
                                  for (k -= g; (T[s++] = d[$++]), --g; );
                                  if ((($ = 0), f < k)) {
                                    for (k -= g = f; (T[s++] = d[$++]), --g; );
                                    (($ = s - y), (x = T));
                                  }
                                }
                              } else if ((($ += f - g), g < k)) {
                                for (k -= g; (T[s++] = d[$++]), --g; );
                                (($ = s - y), (x = T));
                              }
                              for (; 2 < k; )
                                ((T[s++] = x[$++]),
                                  (T[s++] = x[$++]),
                                  (T[s++] = x[$++]),
                                  (k -= 3));
                              k &&
                                ((T[s++] = x[$++]), 1 < k && (T[s++] = x[$++]));
                            } else {
                              for (
                                $ = s - y;
                                (T[s++] = T[$++]),
                                  (T[s++] = T[$++]),
                                  (T[s++] = T[$++]),
                                  2 < (k -= 3);
                              );
                              k &&
                                ((T[s++] = T[$++]), 1 < k && (T[s++] = T[$++]));
                            }
                            break;
                          }
                        }
                        break;
                      }
                    } while (n < r && s < a);
                    ((n -= k = m >> 3),
                      (h &= (1 << (m -= k << 3)) - 1),
                      (t.next_in = n),
                      (t.next_out = s),
                      (t.avail_in = n < r ? r - n + 5 : 5 - (n - r)),
                      (t.avail_out = s < a ? a - s + 257 : 257 - (s - a)),
                      (i.hold = h),
                      (i.bits = m));
                  };
                },
                {},
              ],
              49: [
                function (t, e, i) {
                  var n = t("../utils/common"),
                    r = t("./adler32"),
                    s = t("./crc32"),
                    o = t("./inffast"),
                    a = t("./inftrees"),
                    u = 1,
                    c = 2,
                    l = 0,
                    f = -2,
                    d = 1,
                    h = 852,
                    m = 592;
                  function v(t) {
                    return (
                      ((t >>> 24) & 255) +
                      ((t >>> 8) & 65280) +
                      ((65280 & t) << 8) +
                      ((255 & t) << 24)
                    );
                  }
                  function p() {
                    ((this.mode = 0),
                      (this.last = !1),
                      (this.wrap = 0),
                      (this.havedict = !1),
                      (this.flags = 0),
                      (this.dmax = 0),
                      (this.check = 0),
                      (this.total = 0),
                      (this.head = null),
                      (this.wbits = 0),
                      (this.wsize = 0),
                      (this.whave = 0),
                      (this.wnext = 0),
                      (this.window = null),
                      (this.hold = 0),
                      (this.bits = 0),
                      (this.length = 0),
                      (this.offset = 0),
                      (this.extra = 0),
                      (this.lencode = null),
                      (this.distcode = null),
                      (this.lenbits = 0),
                      (this.distbits = 0),
                      (this.ncode = 0),
                      (this.nlen = 0),
                      (this.ndist = 0),
                      (this.have = 0),
                      (this.next = null),
                      (this.lens = new n.Buf16(320)),
                      (this.work = new n.Buf16(288)),
                      (this.lendyn = null),
                      (this.distdyn = null),
                      (this.sane = 0),
                      (this.back = 0),
                      (this.was = 0));
                  }
                  function _(t) {
                    var e;
                    return t && t.state
                      ? ((e = t.state),
                        (t.total_in = t.total_out = e.total = 0),
                        (t.msg = ""),
                        e.wrap && (t.adler = 1 & e.wrap),
                        (e.mode = 1),
                        (e.last = 0),
                        (e.havedict = 0),
                        (e.dmax = 32768),
                        (e.head = null),
                        (e.hold = 0),
                        (e.bits = 0),
                        (e.lencode = e.lendyn = new n.Buf32(h)),
                        (e.distcode = e.distdyn = new n.Buf32(m)),
                        (e.sane = 1),
                        (e.back = -1),
                        0)
                      : f;
                  }
                  function w(t) {
                    var e;
                    return t && t.state
                      ? (((e = t.state).wsize = 0),
                        (e.whave = 0),
                        (e.wnext = 0),
                        _(t))
                      : f;
                  }
                  function b(t, e) {
                    var i, n;
                    return t && t.state
                      ? ((n = t.state),
                        e < 0
                          ? ((i = 0), (e = -e))
                          : ((i = 1 + (e >> 4)), e < 48 && (e &= 15)),
                        e && (e < 8 || 15 < e)
                          ? f
                          : (null !== n.window &&
                              n.wbits !== e &&
                              (n.window = null),
                            (n.wrap = i),
                            (n.wbits = e),
                            w(t)))
                      : f;
                  }
                  function g(t, e) {
                    var i, n;
                    return t
                      ? ((n = new p()),
                        ((t.state = n).window = null),
                        0 !== (i = b(t, e)) && (t.state = null),
                        i)
                      : f;
                  }
                  var k,
                    y,
                    $ = !0;
                  function x(t) {
                    if ($) {
                      var e;
                      for (
                        k = new n.Buf32(512), y = new n.Buf32(32), e = 0;
                        e < 144;
                      )
                        t.lens[e++] = 8;
                      for (; e < 256; ) t.lens[e++] = 9;
                      for (; e < 280; ) t.lens[e++] = 7;
                      for (; e < 288; ) t.lens[e++] = 8;
                      for (
                        a(1, t.lens, 0, 288, k, 0, t.work, { bits: 9 }), e = 0;
                        e < 32;
                      )
                        t.lens[e++] = 5;
                      (a(2, t.lens, 0, 32, y, 0, t.work, { bits: 5 }),
                        ($ = !1));
                    }
                    ((t.lencode = k),
                      (t.lenbits = 9),
                      (t.distcode = y),
                      (t.distbits = 5));
                  }
                  function E(t, e, i, r) {
                    var s,
                      o = t.state;
                    return (
                      null === o.window &&
                        ((o.wsize = 1 << o.wbits),
                        (o.wnext = 0),
                        (o.whave = 0),
                        (o.window = new n.Buf8(o.wsize))),
                      r >= o.wsize
                        ? (n.arraySet(o.window, e, i - o.wsize, o.wsize, 0),
                          (o.wnext = 0),
                          (o.whave = o.wsize))
                        : (r < (s = o.wsize - o.wnext) && (s = r),
                          n.arraySet(o.window, e, i - r, s, o.wnext),
                          (r -= s)
                            ? (n.arraySet(o.window, e, i - r, r, 0),
                              (o.wnext = r),
                              (o.whave = o.wsize))
                            : ((o.wnext += s),
                              o.wnext === o.wsize && (o.wnext = 0),
                              o.whave < o.wsize && (o.whave += s))),
                      0
                    );
                  }
                  ((i.inflateReset = w),
                    (i.inflateReset2 = b),
                    (i.inflateResetKeep = _),
                    (i.inflateInit = function (t) {
                      return g(t, 15);
                    }),
                    (i.inflateInit2 = g),
                    (i.inflate = function (t, e) {
                      var i,
                        u,
                        c,
                        l,
                        d,
                        h,
                        m,
                        p,
                        _,
                        w,
                        b,
                        g,
                        k,
                        y,
                        $,
                        T,
                        P,
                        I,
                        A,
                        S,
                        N,
                        D,
                        U,
                        C,
                        B = 0,
                        R = new n.Buf8(4),
                        z = [
                          16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2,
                          14, 1, 15,
                        ];
                      if (
                        !t ||
                        !t.state ||
                        !t.output ||
                        (!t.input && 0 !== t.avail_in)
                      )
                        return f;
                      (12 === (i = t.state).mode && (i.mode = 13),
                        (d = t.next_out),
                        (c = t.output),
                        (m = t.avail_out),
                        (l = t.next_in),
                        (u = t.input),
                        (h = t.avail_in),
                        (p = i.hold),
                        (_ = i.bits),
                        (w = h),
                        (b = m),
                        (D = 0));
                      t: for (;;)
                        switch (i.mode) {
                          case 1:
                            if (0 === i.wrap) {
                              i.mode = 13;
                              break;
                            }
                            for (; _ < 16; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if (2 & i.wrap && 35615 === p) {
                              ((R[(i.check = 0)] = 255 & p),
                                (R[1] = (p >>> 8) & 255),
                                (i.check = s(i.check, R, 2, 0)),
                                (_ = p = 0),
                                (i.mode = 2));
                              break;
                            }
                            if (
                              ((i.flags = 0),
                              i.head && (i.head.done = !1),
                              !(1 & i.wrap) ||
                                (((255 & p) << 8) + (p >> 8)) % 31)
                            ) {
                              ((t.msg = "incorrect header check"),
                                (i.mode = 30));
                              break;
                            }
                            if (8 != (15 & p)) {
                              ((t.msg = "unknown compression method"),
                                (i.mode = 30));
                              break;
                            }
                            if (
                              ((_ -= 4),
                              (N = 8 + (15 & (p >>>= 4))),
                              0 === i.wbits)
                            )
                              i.wbits = N;
                            else if (N > i.wbits) {
                              ((t.msg = "invalid window size"), (i.mode = 30));
                              break;
                            }
                            ((i.dmax = 1 << N),
                              (t.adler = i.check = 1),
                              (i.mode = 512 & p ? 10 : 12),
                              (_ = p = 0));
                            break;
                          case 2:
                            for (; _ < 16; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if (((i.flags = p), 8 != (255 & i.flags))) {
                              ((t.msg = "unknown compression method"),
                                (i.mode = 30));
                              break;
                            }
                            if (57344 & i.flags) {
                              ((t.msg = "unknown header flags set"),
                                (i.mode = 30));
                              break;
                            }
                            (i.head && (i.head.text = (p >> 8) & 1),
                              512 & i.flags &&
                                ((R[0] = 255 & p),
                                (R[1] = (p >>> 8) & 255),
                                (i.check = s(i.check, R, 2, 0))),
                              (_ = p = 0),
                              (i.mode = 3));
                          case 3:
                            for (; _ < 32; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            (i.head && (i.head.time = p),
                              512 & i.flags &&
                                ((R[0] = 255 & p),
                                (R[1] = (p >>> 8) & 255),
                                (R[2] = (p >>> 16) & 255),
                                (R[3] = (p >>> 24) & 255),
                                (i.check = s(i.check, R, 4, 0))),
                              (_ = p = 0),
                              (i.mode = 4));
                          case 4:
                            for (; _ < 16; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            (i.head &&
                              ((i.head.xflags = 255 & p), (i.head.os = p >> 8)),
                              512 & i.flags &&
                                ((R[0] = 255 & p),
                                (R[1] = (p >>> 8) & 255),
                                (i.check = s(i.check, R, 2, 0))),
                              (_ = p = 0),
                              (i.mode = 5));
                          case 5:
                            if (1024 & i.flags) {
                              for (; _ < 16; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((i.length = p),
                                i.head && (i.head.extra_len = p),
                                512 & i.flags &&
                                  ((R[0] = 255 & p),
                                  (R[1] = (p >>> 8) & 255),
                                  (i.check = s(i.check, R, 2, 0))),
                                (_ = p = 0));
                            } else i.head && (i.head.extra = null);
                            i.mode = 6;
                          case 6:
                            if (
                              1024 & i.flags &&
                              (h < (g = i.length) && (g = h),
                              g &&
                                (i.head &&
                                  ((N = i.head.extra_len - i.length),
                                  i.head.extra ||
                                    (i.head.extra = new Array(
                                      i.head.extra_len,
                                    )),
                                  n.arraySet(i.head.extra, u, l, g, N)),
                                512 & i.flags &&
                                  (i.check = s(i.check, u, g, l)),
                                (h -= g),
                                (l += g),
                                (i.length -= g)),
                              i.length)
                            )
                              break t;
                            ((i.length = 0), (i.mode = 7));
                          case 7:
                            if (2048 & i.flags) {
                              if (0 === h) break t;
                              for (
                                g = 0;
                                (N = u[l + g++]),
                                  i.head &&
                                    N &&
                                    i.length < 65536 &&
                                    (i.head.name += String.fromCharCode(N)),
                                  N && g < h;
                              );
                              if (
                                (512 & i.flags &&
                                  (i.check = s(i.check, u, g, l)),
                                (h -= g),
                                (l += g),
                                N)
                              )
                                break t;
                            } else i.head && (i.head.name = null);
                            ((i.length = 0), (i.mode = 8));
                          case 8:
                            if (4096 & i.flags) {
                              if (0 === h) break t;
                              for (
                                g = 0;
                                (N = u[l + g++]),
                                  i.head &&
                                    N &&
                                    i.length < 65536 &&
                                    (i.head.comment += String.fromCharCode(N)),
                                  N && g < h;
                              );
                              if (
                                (512 & i.flags &&
                                  (i.check = s(i.check, u, g, l)),
                                (h -= g),
                                (l += g),
                                N)
                              )
                                break t;
                            } else i.head && (i.head.comment = null);
                            i.mode = 9;
                          case 9:
                            if (512 & i.flags) {
                              for (; _ < 16; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              if (p !== (65535 & i.check)) {
                                ((t.msg = "header crc mismatch"),
                                  (i.mode = 30));
                                break;
                              }
                              _ = p = 0;
                            }
                            (i.head &&
                              ((i.head.hcrc = (i.flags >> 9) & 1),
                              (i.head.done = !0)),
                              (t.adler = i.check = 0),
                              (i.mode = 12));
                            break;
                          case 10:
                            for (; _ < 32; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            ((t.adler = i.check = v(p)),
                              (_ = p = 0),
                              (i.mode = 11));
                          case 11:
                            if (0 === i.havedict)
                              return (
                                (t.next_out = d),
                                (t.avail_out = m),
                                (t.next_in = l),
                                (t.avail_in = h),
                                (i.hold = p),
                                (i.bits = _),
                                2
                              );
                            ((t.adler = i.check = 1), (i.mode = 12));
                          case 12:
                            if (5 === e || 6 === e) break t;
                          case 13:
                            if (i.last) {
                              ((p >>>= 7 & _), (_ -= 7 & _), (i.mode = 27));
                              break;
                            }
                            for (; _ < 3; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            switch (
                              ((i.last = 1 & p), (_ -= 1), 3 & (p >>>= 1))
                            ) {
                              case 0:
                                i.mode = 14;
                                break;
                              case 1:
                                if ((x(i), (i.mode = 20), 6 !== e)) break;
                                ((p >>>= 2), (_ -= 2));
                                break t;
                              case 2:
                                i.mode = 17;
                                break;
                              case 3:
                                ((t.msg = "invalid block type"), (i.mode = 30));
                            }
                            ((p >>>= 2), (_ -= 2));
                            break;
                          case 14:
                            for (p >>>= 7 & _, _ -= 7 & _; _ < 32; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if ((65535 & p) != ((p >>> 16) ^ 65535)) {
                              ((t.msg = "invalid stored block lengths"),
                                (i.mode = 30));
                              break;
                            }
                            if (
                              ((i.length = 65535 & p),
                              (_ = p = 0),
                              (i.mode = 15),
                              6 === e)
                            )
                              break t;
                          case 15:
                            i.mode = 16;
                          case 16:
                            if ((g = i.length)) {
                              if ((h < g && (g = h), m < g && (g = m), 0 === g))
                                break t;
                              (n.arraySet(c, u, l, g, d),
                                (h -= g),
                                (l += g),
                                (m -= g),
                                (d += g),
                                (i.length -= g));
                              break;
                            }
                            i.mode = 12;
                            break;
                          case 17:
                            for (; _ < 14; ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if (
                              ((i.nlen = 257 + (31 & p)),
                              (p >>>= 5),
                              (_ -= 5),
                              (i.ndist = 1 + (31 & p)),
                              (p >>>= 5),
                              (_ -= 5),
                              (i.ncode = 4 + (15 & p)),
                              (p >>>= 4),
                              (_ -= 4),
                              286 < i.nlen || 30 < i.ndist)
                            ) {
                              ((t.msg = "too many length or distance symbols"),
                                (i.mode = 30));
                              break;
                            }
                            ((i.have = 0), (i.mode = 18));
                          case 18:
                            for (; i.have < i.ncode; ) {
                              for (; _ < 3; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((i.lens[z[i.have++]] = 7 & p),
                                (p >>>= 3),
                                (_ -= 3));
                            }
                            for (; i.have < 19; ) i.lens[z[i.have++]] = 0;
                            if (
                              ((i.lencode = i.lendyn),
                              (i.lenbits = 7),
                              (U = { bits: i.lenbits }),
                              (D = a(
                                0,
                                i.lens,
                                0,
                                19,
                                i.lencode,
                                0,
                                i.work,
                                U,
                              )),
                              (i.lenbits = U.bits),
                              D)
                            ) {
                              ((t.msg = "invalid code lengths set"),
                                (i.mode = 30));
                              break;
                            }
                            ((i.have = 0), (i.mode = 19));
                          case 19:
                            for (; i.have < i.nlen + i.ndist; ) {
                              for (
                                ;
                                (T =
                                  ((B =
                                    i.lencode[p & ((1 << i.lenbits) - 1)]) >>>
                                    16) &
                                  255),
                                  (P = 65535 & B),
                                  !(($ = B >>> 24) <= _);
                              ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              if (P < 16)
                                ((p >>>= $), (_ -= $), (i.lens[i.have++] = P));
                              else {
                                if (16 === P) {
                                  for (C = $ + 2; _ < C; ) {
                                    if (0 === h) break t;
                                    (h--, (p += u[l++] << _), (_ += 8));
                                  }
                                  if (((p >>>= $), (_ -= $), 0 === i.have)) {
                                    ((t.msg = "invalid bit length repeat"),
                                      (i.mode = 30));
                                    break;
                                  }
                                  ((N = i.lens[i.have - 1]),
                                    (g = 3 + (3 & p)),
                                    (p >>>= 2),
                                    (_ -= 2));
                                } else if (17 === P) {
                                  for (C = $ + 3; _ < C; ) {
                                    if (0 === h) break t;
                                    (h--, (p += u[l++] << _), (_ += 8));
                                  }
                                  ((_ -= $),
                                    (N = 0),
                                    (g = 3 + (7 & (p >>>= $))),
                                    (p >>>= 3),
                                    (_ -= 3));
                                } else {
                                  for (C = $ + 7; _ < C; ) {
                                    if (0 === h) break t;
                                    (h--, (p += u[l++] << _), (_ += 8));
                                  }
                                  ((_ -= $),
                                    (N = 0),
                                    (g = 11 + (127 & (p >>>= $))),
                                    (p >>>= 7),
                                    (_ -= 7));
                                }
                                if (i.have + g > i.nlen + i.ndist) {
                                  ((t.msg = "invalid bit length repeat"),
                                    (i.mode = 30));
                                  break;
                                }
                                for (; g--; ) i.lens[i.have++] = N;
                              }
                            }
                            if (30 === i.mode) break;
                            if (0 === i.lens[256]) {
                              ((t.msg = "invalid code -- missing end-of-block"),
                                (i.mode = 30));
                              break;
                            }
                            if (
                              ((i.lenbits = 9),
                              (U = { bits: i.lenbits }),
                              (D = a(
                                1,
                                i.lens,
                                0,
                                i.nlen,
                                i.lencode,
                                0,
                                i.work,
                                U,
                              )),
                              (i.lenbits = U.bits),
                              D)
                            ) {
                              ((t.msg = "invalid literal/lengths set"),
                                (i.mode = 30));
                              break;
                            }
                            if (
                              ((i.distbits = 6),
                              (i.distcode = i.distdyn),
                              (U = { bits: i.distbits }),
                              (D = a(
                                2,
                                i.lens,
                                i.nlen,
                                i.ndist,
                                i.distcode,
                                0,
                                i.work,
                                U,
                              )),
                              (i.distbits = U.bits),
                              D)
                            ) {
                              ((t.msg = "invalid distances set"),
                                (i.mode = 30));
                              break;
                            }
                            if (((i.mode = 20), 6 === e)) break t;
                          case 20:
                            i.mode = 21;
                          case 21:
                            if (6 <= h && 258 <= m) {
                              ((t.next_out = d),
                                (t.avail_out = m),
                                (t.next_in = l),
                                (t.avail_in = h),
                                (i.hold = p),
                                (i.bits = _),
                                o(t, b),
                                (d = t.next_out),
                                (c = t.output),
                                (m = t.avail_out),
                                (l = t.next_in),
                                (u = t.input),
                                (h = t.avail_in),
                                (p = i.hold),
                                (_ = i.bits),
                                12 === i.mode && (i.back = -1));
                              break;
                            }
                            for (
                              i.back = 0;
                              (T =
                                ((B = i.lencode[p & ((1 << i.lenbits) - 1)]) >>>
                                  16) &
                                255),
                                (P = 65535 & B),
                                !(($ = B >>> 24) <= _);
                            ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if (T && !(240 & T)) {
                              for (
                                I = $, A = T, S = P;
                                (T =
                                  ((B =
                                    i.lencode[
                                      S + ((p & ((1 << (I + A)) - 1)) >> I)
                                    ]) >>>
                                    16) &
                                  255),
                                  (P = 65535 & B),
                                  !(I + ($ = B >>> 24) <= _);
                              ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((p >>>= I), (_ -= I), (i.back += I));
                            }
                            if (
                              ((p >>>= $),
                              (_ -= $),
                              (i.back += $),
                              (i.length = P),
                              0 === T)
                            ) {
                              i.mode = 26;
                              break;
                            }
                            if (32 & T) {
                              ((i.back = -1), (i.mode = 12));
                              break;
                            }
                            if (64 & T) {
                              ((t.msg = "invalid literal/length code"),
                                (i.mode = 30));
                              break;
                            }
                            ((i.extra = 15 & T), (i.mode = 22));
                          case 22:
                            if (i.extra) {
                              for (C = i.extra; _ < C; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((i.length += p & ((1 << i.extra) - 1)),
                                (p >>>= i.extra),
                                (_ -= i.extra),
                                (i.back += i.extra));
                            }
                            ((i.was = i.length), (i.mode = 23));
                          case 23:
                            for (
                              ;
                              (T =
                                ((B =
                                  i.distcode[p & ((1 << i.distbits) - 1)]) >>>
                                  16) &
                                255),
                                (P = 65535 & B),
                                !(($ = B >>> 24) <= _);
                            ) {
                              if (0 === h) break t;
                              (h--, (p += u[l++] << _), (_ += 8));
                            }
                            if (!(240 & T)) {
                              for (
                                I = $, A = T, S = P;
                                (T =
                                  ((B =
                                    i.distcode[
                                      S + ((p & ((1 << (I + A)) - 1)) >> I)
                                    ]) >>>
                                    16) &
                                  255),
                                  (P = 65535 & B),
                                  !(I + ($ = B >>> 24) <= _);
                              ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((p >>>= I), (_ -= I), (i.back += I));
                            }
                            if (((p >>>= $), (_ -= $), (i.back += $), 64 & T)) {
                              ((t.msg = "invalid distance code"),
                                (i.mode = 30));
                              break;
                            }
                            ((i.offset = P), (i.extra = 15 & T), (i.mode = 24));
                          case 24:
                            if (i.extra) {
                              for (C = i.extra; _ < C; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              ((i.offset += p & ((1 << i.extra) - 1)),
                                (p >>>= i.extra),
                                (_ -= i.extra),
                                (i.back += i.extra));
                            }
                            if (i.offset > i.dmax) {
                              ((t.msg = "invalid distance too far back"),
                                (i.mode = 30));
                              break;
                            }
                            i.mode = 25;
                          case 25:
                            if (0 === m) break t;
                            if (((g = b - m), i.offset > g)) {
                              if ((g = i.offset - g) > i.whave && i.sane) {
                                ((t.msg = "invalid distance too far back"),
                                  (i.mode = 30));
                                break;
                              }
                              ((k =
                                g > i.wnext
                                  ? ((g -= i.wnext), i.wsize - g)
                                  : i.wnext - g),
                                g > i.length && (g = i.length),
                                (y = i.window));
                            } else
                              ((y = c), (k = d - i.offset), (g = i.length));
                            for (
                              m < g && (g = m), m -= g, i.length -= g;
                              (c[d++] = y[k++]), --g;
                            );
                            0 === i.length && (i.mode = 21);
                            break;
                          case 26:
                            if (0 === m) break t;
                            ((c[d++] = i.length), m--, (i.mode = 21));
                            break;
                          case 27:
                            if (i.wrap) {
                              for (; _ < 32; ) {
                                if (0 === h) break t;
                                (h--, (p |= u[l++] << _), (_ += 8));
                              }
                              if (
                                ((b -= m),
                                (t.total_out += b),
                                (i.total += b),
                                b &&
                                  (t.adler = i.check =
                                    i.flags
                                      ? s(i.check, c, b, d - b)
                                      : r(i.check, c, b, d - b)),
                                (b = m),
                                (i.flags ? p : v(p)) !== i.check)
                              ) {
                                ((t.msg = "incorrect data check"),
                                  (i.mode = 30));
                                break;
                              }
                              _ = p = 0;
                            }
                            i.mode = 28;
                          case 28:
                            if (i.wrap && i.flags) {
                              for (; _ < 32; ) {
                                if (0 === h) break t;
                                (h--, (p += u[l++] << _), (_ += 8));
                              }
                              if (p !== (4294967295 & i.total)) {
                                ((t.msg = "incorrect length check"),
                                  (i.mode = 30));
                                break;
                              }
                              _ = p = 0;
                            }
                            i.mode = 29;
                          case 29:
                            D = 1;
                            break t;
                          case 30:
                            D = -3;
                            break t;
                          case 31:
                            return -4;
                          case 32:
                          default:
                            return f;
                        }
                      return (
                        (t.next_out = d),
                        (t.avail_out = m),
                        (t.next_in = l),
                        (t.avail_in = h),
                        (i.hold = p),
                        (i.bits = _),
                        (i.wsize ||
                          (b !== t.avail_out &&
                            i.mode < 30 &&
                            (i.mode < 27 || 4 !== e))) &&
                        E(t, t.output, t.next_out, b - t.avail_out)
                          ? ((i.mode = 31), -4)
                          : ((w -= t.avail_in),
                            (b -= t.avail_out),
                            (t.total_in += w),
                            (t.total_out += b),
                            (i.total += b),
                            i.wrap &&
                              b &&
                              (t.adler = i.check =
                                i.flags
                                  ? s(i.check, c, b, t.next_out - b)
                                  : r(i.check, c, b, t.next_out - b)),
                            (t.data_type =
                              i.bits +
                              (i.last ? 64 : 0) +
                              (12 === i.mode ? 128 : 0) +
                              (20 === i.mode || 15 === i.mode ? 256 : 0)),
                            ((0 == w && 0 === b) || 4 === e) &&
                              0 === D &&
                              (D = -5),
                            D)
                      );
                    }),
                    (i.inflateEnd = function (t) {
                      if (!t || !t.state) return f;
                      var e = t.state;
                      return (
                        e.window && (e.window = null),
                        (t.state = null),
                        0
                      );
                    }),
                    (i.inflateGetHeader = function (t, e) {
                      var i;
                      return t && t.state && 2 & (i = t.state).wrap
                        ? (((i.head = e).done = !1), 0)
                        : f;
                    }),
                    (i.inflateSetDictionary = function (t, e) {
                      var i,
                        n = e.length;
                      return t && t.state
                        ? 0 !== (i = t.state).wrap && 11 !== i.mode
                          ? f
                          : 11 === i.mode && r(1, e, n, 0) !== i.check
                            ? -3
                            : E(t, e, n, n)
                              ? ((i.mode = 31), -4)
                              : ((i.havedict = 1), 0)
                        : f;
                    }),
                    (i.inflateInfo = "pako inflate (from Nodeca project)"));
                },
                {
                  "../utils/common": 41,
                  "./adler32": 43,
                  "./crc32": 45,
                  "./inffast": 48,
                  "./inftrees": 50,
                },
              ],
              50: [
                function (t, e, i) {
                  var n = t("../utils/common"),
                    r = [
                      3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
                      35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
                      0, 0,
                    ],
                    s = [
                      16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18,
                      18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21,
                      16, 72, 78,
                    ],
                    o = [
                      1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
                      257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
                      8193, 12289, 16385, 24577, 0, 0,
                    ],
                    a = [
                      16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21,
                      22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28,
                      29, 29, 64, 64,
                    ];
                  e.exports = function (t, e, i, u, c, l, f, d) {
                    var h,
                      m,
                      v,
                      p,
                      _,
                      w,
                      b,
                      g,
                      k,
                      y = d.bits,
                      $ = 0,
                      x = 0,
                      E = 0,
                      T = 0,
                      P = 0,
                      I = 0,
                      A = 0,
                      S = 0,
                      N = 0,
                      D = 0,
                      U = null,
                      C = 0,
                      B = new n.Buf16(16),
                      R = new n.Buf16(16),
                      z = null,
                      F = 0;
                    for ($ = 0; $ <= 15; $++) B[$] = 0;
                    for (x = 0; x < u; x++) B[e[i + x]]++;
                    for (P = y, T = 15; 1 <= T && 0 === B[T]; T--);
                    if ((T < P && (P = T), 0 === T))
                      return (
                        (c[l++] = 20971520),
                        (c[l++] = 20971520),
                        (d.bits = 1),
                        0
                      );
                    for (E = 1; E < T && 0 === B[E]; E++);
                    for (P < E && (P = E), $ = S = 1; $ <= 15; $++)
                      if (((S <<= 1), (S -= B[$]) < 0)) return -1;
                    if (0 < S && (0 === t || 1 !== T)) return -1;
                    for (R[1] = 0, $ = 1; $ < 15; $++) R[$ + 1] = R[$] + B[$];
                    for (x = 0; x < u; x++)
                      0 !== e[i + x] && (f[R[e[i + x]]++] = x);
                    if (
                      ((w =
                        0 === t
                          ? ((U = z = f), 19)
                          : 1 === t
                            ? ((U = r), (C -= 257), (z = s), (F -= 257), 256)
                            : ((U = o), (z = a), -1)),
                      ($ = E),
                      (_ = l),
                      (A = x = D = 0),
                      (v = -1),
                      (p = (N = 1 << (I = P)) - 1),
                      (1 === t && 852 < N) || (2 === t && 592 < N))
                    )
                      return 1;
                    for (;;) {
                      for (
                        b = $ - A,
                          k =
                            f[x] < w
                              ? ((g = 0), f[x])
                              : f[x] > w
                                ? ((g = z[F + f[x]]), U[C + f[x]])
                                : ((g = 96), 0),
                          h = 1 << ($ - A),
                          E = m = 1 << I;
                        (c[_ + (D >> A) + (m -= h)] =
                          (b << 24) | (g << 16) | k),
                          0 !== m;
                      );
                      for (h = 1 << ($ - 1); D & h; ) h >>= 1;
                      if (
                        (0 !== h ? ((D &= h - 1), (D += h)) : (D = 0),
                        x++,
                        0 == --B[$])
                      ) {
                        if ($ === T) break;
                        $ = e[i + f[x]];
                      }
                      if (P < $ && (D & p) !== v) {
                        for (
                          0 === A && (A = P), _ += E, S = 1 << (I = $ - A);
                          I + A < T && !((S -= B[I + A]) <= 0);
                        )
                          (I++, (S <<= 1));
                        if (
                          ((N += 1 << I),
                          (1 === t && 852 < N) || (2 === t && 592 < N))
                        )
                          return 1;
                        c[(v = D & p)] = (P << 24) | (I << 16) | (_ - l);
                      }
                    }
                    return (
                      0 !== D && (c[_ + D] = (($ - A) << 24) | (64 << 16)),
                      (d.bits = P),
                      0
                    );
                  };
                },
                { "../utils/common": 41 },
              ],
              51: [
                function (t, e, i) {
                  e.exports = {
                    2: "need dictionary",
                    1: "stream end",
                    0: "",
                    "-1": "file error",
                    "-2": "stream error",
                    "-3": "data error",
                    "-4": "insufficient memory",
                    "-5": "buffer error",
                    "-6": "incompatible version",
                  };
                },
                {},
              ],
              52: [
                function (t, e, i) {
                  var n = t("../utils/common"),
                    r = 0,
                    s = 1;
                  function o(t) {
                    for (var e = t.length; 0 <= --e; ) t[e] = 0;
                  }
                  var a = 0,
                    u = 29,
                    c = 256,
                    l = 286,
                    f = 30,
                    d = 19,
                    h = 573,
                    m = 15,
                    v = 16,
                    p = 7,
                    _ = 256,
                    w = 16,
                    b = 17,
                    g = 18,
                    k = [
                      0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3,
                      3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
                    ],
                    y = [
                      0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8,
                      8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
                    ],
                    $ = [
                      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7,
                    ],
                    x = [
                      16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14,
                      1, 15,
                    ],
                    E = new Array(576);
                  o(E);
                  var T = new Array(60);
                  o(T);
                  var P = new Array(512);
                  o(P);
                  var I = new Array(256);
                  o(I);
                  var A = new Array(u);
                  o(A);
                  var S,
                    N,
                    D,
                    U = new Array(f);
                  function C(t, e, i, n, r) {
                    ((this.static_tree = t),
                      (this.extra_bits = e),
                      (this.extra_base = i),
                      (this.elems = n),
                      (this.max_length = r),
                      (this.has_stree = t && t.length));
                  }
                  function B(t, e) {
                    ((this.dyn_tree = t),
                      (this.max_code = 0),
                      (this.stat_desc = e));
                  }
                  function R(t) {
                    return t < 256 ? P[t] : P[256 + (t >>> 7)];
                  }
                  function z(t, e) {
                    ((t.pending_buf[t.pending++] = 255 & e),
                      (t.pending_buf[t.pending++] = (e >>> 8) & 255));
                  }
                  function F(t, e, i) {
                    t.bi_valid > v - i
                      ? ((t.bi_buf |= (e << t.bi_valid) & 65535),
                        z(t, t.bi_buf),
                        (t.bi_buf = e >> (v - t.bi_valid)),
                        (t.bi_valid += i - v))
                      : ((t.bi_buf |= (e << t.bi_valid) & 65535),
                        (t.bi_valid += i));
                  }
                  function O(t, e, i) {
                    F(t, i[2 * e], i[2 * e + 1]);
                  }
                  function L(t, e) {
                    for (
                      var i = 0;
                      (i |= 1 & t), (t >>>= 1), (i <<= 1), 0 < --e;
                    );
                    return i >>> 1;
                  }
                  function M(t, e, i) {
                    var n,
                      r,
                      s = new Array(16),
                      o = 0;
                    for (n = 1; n <= m; n++) s[n] = o = (o + i[n - 1]) << 1;
                    for (r = 0; r <= e; r++) {
                      var a = t[2 * r + 1];
                      0 !== a && (t[2 * r] = L(s[a]++, a));
                    }
                  }
                  function W(t) {
                    var e;
                    for (e = 0; e < l; e++) t.dyn_ltree[2 * e] = 0;
                    for (e = 0; e < f; e++) t.dyn_dtree[2 * e] = 0;
                    for (e = 0; e < d; e++) t.bl_tree[2 * e] = 0;
                    ((t.dyn_ltree[512] = 1),
                      (t.opt_len = t.static_len = 0),
                      (t.last_lit = t.matches = 0));
                  }
                  function j(t) {
                    (8 < t.bi_valid
                      ? z(t, t.bi_buf)
                      : 0 < t.bi_valid &&
                        (t.pending_buf[t.pending++] = t.bi_buf),
                      (t.bi_buf = 0),
                      (t.bi_valid = 0));
                  }
                  function Z(t, e, i, n) {
                    var r = 2 * e,
                      s = 2 * i;
                    return t[r] < t[s] || (t[r] === t[s] && n[e] <= n[i]);
                  }
                  function G(t, e, i) {
                    for (
                      var n = t.heap[i], r = i << 1;
                      r <= t.heap_len &&
                      (r < t.heap_len &&
                        Z(e, t.heap[r + 1], t.heap[r], t.depth) &&
                        r++,
                      !Z(e, n, t.heap[r], t.depth));
                    )
                      ((t.heap[i] = t.heap[r]), (i = r), (r <<= 1));
                    t.heap[i] = n;
                  }
                  function H(t, e, i) {
                    var n,
                      r,
                      s,
                      o,
                      a = 0;
                    if (0 !== t.last_lit)
                      for (
                        ;
                        (n =
                          (t.pending_buf[t.d_buf + 2 * a] << 8) |
                          t.pending_buf[t.d_buf + 2 * a + 1]),
                          (r = t.pending_buf[t.l_buf + a]),
                          a++,
                          0 === n
                            ? O(t, r, e)
                            : (O(t, (s = I[r]) + c + 1, e),
                              0 !== (o = k[s]) && F(t, (r -= A[s]), o),
                              O(t, (s = R(--n)), i),
                              0 !== (o = y[s]) && F(t, (n -= U[s]), o)),
                          a < t.last_lit;
                      );
                    O(t, _, e);
                  }
                  function K(t, e) {
                    var i,
                      n,
                      r,
                      s = e.dyn_tree,
                      o = e.stat_desc.static_tree,
                      a = e.stat_desc.has_stree,
                      u = e.stat_desc.elems,
                      c = -1;
                    for (t.heap_len = 0, t.heap_max = h, i = 0; i < u; i++)
                      0 !== s[2 * i]
                        ? ((t.heap[++t.heap_len] = c = i), (t.depth[i] = 0))
                        : (s[2 * i + 1] = 0);
                    for (; t.heap_len < 2; )
                      ((s[2 * (r = t.heap[++t.heap_len] = c < 2 ? ++c : 0)] =
                        1),
                        (t.depth[r] = 0),
                        t.opt_len--,
                        a && (t.static_len -= o[2 * r + 1]));
                    for (e.max_code = c, i = t.heap_len >> 1; 1 <= i; i--)
                      G(t, s, i);
                    for (
                      r = u;
                      (i = t.heap[1]),
                        (t.heap[1] = t.heap[t.heap_len--]),
                        G(t, s, 1),
                        (n = t.heap[1]),
                        (t.heap[--t.heap_max] = i),
                        (t.heap[--t.heap_max] = n),
                        (s[2 * r] = s[2 * i] + s[2 * n]),
                        (t.depth[r] =
                          (t.depth[i] >= t.depth[n] ? t.depth[i] : t.depth[n]) +
                          1),
                        (s[2 * i + 1] = s[2 * n + 1] = r),
                        (t.heap[1] = r++),
                        G(t, s, 1),
                        2 <= t.heap_len;
                    );
                    ((t.heap[--t.heap_max] = t.heap[1]),
                      (function (t, e) {
                        var i,
                          n,
                          r,
                          s,
                          o,
                          a,
                          u = e.dyn_tree,
                          c = e.max_code,
                          l = e.stat_desc.static_tree,
                          f = e.stat_desc.has_stree,
                          d = e.stat_desc.extra_bits,
                          v = e.stat_desc.extra_base,
                          p = e.stat_desc.max_length,
                          _ = 0;
                        for (s = 0; s <= m; s++) t.bl_count[s] = 0;
                        for (
                          u[2 * t.heap[t.heap_max] + 1] = 0, i = t.heap_max + 1;
                          i < h;
                          i++
                        )
                          (p <
                            (s = u[2 * u[2 * (n = t.heap[i]) + 1] + 1] + 1) &&
                            ((s = p), _++),
                            (u[2 * n + 1] = s),
                            c < n ||
                              (t.bl_count[s]++,
                              (o = 0),
                              v <= n && (o = d[n - v]),
                              (a = u[2 * n]),
                              (t.opt_len += a * (s + o)),
                              f && (t.static_len += a * (l[2 * n + 1] + o))));
                        if (0 !== _) {
                          do {
                            for (s = p - 1; 0 === t.bl_count[s]; ) s--;
                            (t.bl_count[s]--,
                              (t.bl_count[s + 1] += 2),
                              t.bl_count[p]--,
                              (_ -= 2));
                          } while (0 < _);
                          for (s = p; 0 !== s; s--)
                            for (n = t.bl_count[s]; 0 !== n; )
                              c < (r = t.heap[--i]) ||
                                (u[2 * r + 1] !== s &&
                                  ((t.opt_len += (s - u[2 * r + 1]) * u[2 * r]),
                                  (u[2 * r + 1] = s)),
                                n--);
                        }
                      })(t, e),
                      M(s, c, t.bl_count));
                  }
                  function q(t, e, i) {
                    var n,
                      r,
                      s = -1,
                      o = e[1],
                      a = 0,
                      u = 7,
                      c = 4;
                    for (
                      0 === o && ((u = 138), (c = 3)),
                        e[2 * (i + 1) + 1] = 65535,
                        n = 0;
                      n <= i;
                      n++
                    )
                      ((r = o),
                        (o = e[2 * (n + 1) + 1]),
                        (++a < u && r === o) ||
                          (a < c
                            ? (t.bl_tree[2 * r] += a)
                            : 0 !== r
                              ? (r !== s && t.bl_tree[2 * r]++, t.bl_tree[32]++)
                              : a <= 10
                                ? t.bl_tree[34]++
                                : t.bl_tree[36]++,
                          (s = r),
                          (c =
                            (a = 0) === o
                              ? ((u = 138), 3)
                              : r === o
                                ? ((u = 6), 3)
                                : ((u = 7), 4))));
                  }
                  function J(t, e, i) {
                    var n,
                      r,
                      s = -1,
                      o = e[1],
                      a = 0,
                      u = 7,
                      c = 4;
                    for (0 === o && ((u = 138), (c = 3)), n = 0; n <= i; n++)
                      if (
                        ((r = o),
                        (o = e[2 * (n + 1) + 1]),
                        !(++a < u && r === o))
                      ) {
                        if (a < c) for (; O(t, r, t.bl_tree), 0 != --a; );
                        else
                          0 !== r
                            ? (r !== s && (O(t, r, t.bl_tree), a--),
                              O(t, w, t.bl_tree),
                              F(t, a - 3, 2))
                            : a <= 10
                              ? (O(t, b, t.bl_tree), F(t, a - 3, 3))
                              : (O(t, g, t.bl_tree), F(t, a - 11, 7));
                        ((s = r),
                          (c =
                            (a = 0) === o
                              ? ((u = 138), 3)
                              : r === o
                                ? ((u = 6), 3)
                                : ((u = 7), 4)));
                      }
                  }
                  o(U);
                  var V = !1;
                  function X(t, e, i, r) {
                    (F(t, 0 + (r ? 1 : 0), 3),
                      (function (t, e, i, r) {
                        (j(t),
                          z(t, i),
                          z(t, ~i),
                          n.arraySet(t.pending_buf, t.window, e, i, t.pending),
                          (t.pending += i));
                      })(t, e, i, !0));
                  }
                  ((i._tr_init = function (t) {
                    (V ||
                      ((function () {
                        var t,
                          e,
                          i,
                          n,
                          r,
                          s = new Array(16);
                        for (n = i = 0; n < 28; n++)
                          for (A[n] = i, t = 0; t < 1 << k[n]; t++) I[i++] = n;
                        for (I[i - 1] = n, n = r = 0; n < 16; n++)
                          for (U[n] = r, t = 0; t < 1 << y[n]; t++) P[r++] = n;
                        for (r >>= 7; n < f; n++)
                          for (U[n] = r << 7, t = 0; t < 1 << (y[n] - 7); t++)
                            P[256 + r++] = n;
                        for (e = 0; e <= m; e++) s[e] = 0;
                        for (t = 0; t <= 143; )
                          ((E[2 * t + 1] = 8), t++, s[8]++);
                        for (; t <= 255; ) ((E[2 * t + 1] = 9), t++, s[9]++);
                        for (; t <= 279; ) ((E[2 * t + 1] = 7), t++, s[7]++);
                        for (; t <= 287; ) ((E[2 * t + 1] = 8), t++, s[8]++);
                        for (M(E, 287, s), t = 0; t < f; t++)
                          ((T[2 * t + 1] = 5), (T[2 * t] = L(t, 5)));
                        ((S = new C(E, k, 257, l, m)),
                          (N = new C(T, y, 0, f, m)),
                          (D = new C(new Array(0), $, 0, d, 7)));
                      })(),
                      (V = !0)),
                      (t.l_desc = new B(t.dyn_ltree, S)),
                      (t.d_desc = new B(t.dyn_dtree, N)),
                      (t.bl_desc = new B(t.bl_tree, D)),
                      (t.bi_buf = 0),
                      (t.bi_valid = 0),
                      W(t));
                  }),
                    (i._tr_stored_block = X),
                    (i._tr_flush_block = function (t, e, i, n) {
                      var r,
                        s,
                        o = 0;
                      (0 < t.level
                        ? (2 === t.strm.data_type &&
                            (t.strm.data_type = (function (t) {
                              var e,
                                i = 4093624447;
                              for (e = 0; e <= 31; e++, i >>>= 1)
                                if (1 & i && 0 !== t.dyn_ltree[2 * e]) return 0;
                              if (
                                0 !== t.dyn_ltree[18] ||
                                0 !== t.dyn_ltree[20] ||
                                0 !== t.dyn_ltree[26]
                              )
                                return 1;
                              for (e = 32; e < c; e++)
                                if (0 !== t.dyn_ltree[2 * e]) return 1;
                              return 0;
                            })(t)),
                          K(t, t.l_desc),
                          K(t, t.d_desc),
                          (o = (function (t) {
                            var e;
                            for (
                              q(t, t.dyn_ltree, t.l_desc.max_code),
                                q(t, t.dyn_dtree, t.d_desc.max_code),
                                K(t, t.bl_desc),
                                e = 18;
                              3 <= e && 0 === t.bl_tree[2 * x[e] + 1];
                              e--
                            );
                            return ((t.opt_len += 3 * (e + 1) + 5 + 5 + 4), e);
                          })(t)),
                          (r = (t.opt_len + 3 + 7) >>> 3),
                          (s = (t.static_len + 3 + 7) >>> 3) <= r && (r = s))
                        : (r = s = i + 5),
                        i + 4 <= r && -1 !== e
                          ? X(t, e, i, n)
                          : 4 === t.strategy || s === r
                            ? (F(t, 2 + (n ? 1 : 0), 3), H(t, E, T))
                            : (F(t, 4 + (n ? 1 : 0), 3),
                              (function (t, e, i, n) {
                                var r;
                                for (
                                  F(t, e - 257, 5),
                                    F(t, i - 1, 5),
                                    F(t, n - 4, 4),
                                    r = 0;
                                  r < n;
                                  r++
                                )
                                  F(t, t.bl_tree[2 * x[r] + 1], 3);
                                (J(t, t.dyn_ltree, e - 1),
                                  J(t, t.dyn_dtree, i - 1));
                              })(
                                t,
                                t.l_desc.max_code + 1,
                                t.d_desc.max_code + 1,
                                o + 1,
                              ),
                              H(t, t.dyn_ltree, t.dyn_dtree)),
                        W(t),
                        n && j(t));
                    }),
                    (i._tr_tally = function (t, e, i) {
                      return (
                        (t.pending_buf[t.d_buf + 2 * t.last_lit] =
                          (e >>> 8) & 255),
                        (t.pending_buf[t.d_buf + 2 * t.last_lit + 1] = 255 & e),
                        (t.pending_buf[t.l_buf + t.last_lit] = 255 & i),
                        t.last_lit++,
                        0 === e
                          ? t.dyn_ltree[2 * i]++
                          : (t.matches++,
                            e--,
                            t.dyn_ltree[2 * (I[i] + c + 1)]++,
                            t.dyn_dtree[2 * R(e)]++),
                        t.last_lit === t.lit_bufsize - 1
                      );
                    }),
                    (i._tr_align = function (t) {
                      (F(t, 2, 3),
                        O(t, _, E),
                        (function (t) {
                          16 === t.bi_valid
                            ? (z(t, t.bi_buf), (t.bi_buf = 0), (t.bi_valid = 0))
                            : 8 <= t.bi_valid &&
                              ((t.pending_buf[t.pending++] = 255 & t.bi_buf),
                              (t.bi_buf >>= 8),
                              (t.bi_valid -= 8));
                        })(t));
                    }));
                },
                { "../utils/common": 41 },
              ],
              53: [
                function (t, e, i) {
                  e.exports = function () {
                    ((this.input = null),
                      (this.next_in = 0),
                      (this.avail_in = 0),
                      (this.total_in = 0),
                      (this.output = null),
                      (this.next_out = 0),
                      (this.avail_out = 0),
                      (this.total_out = 0),
                      (this.msg = ""),
                      (this.state = null),
                      (this.data_type = 2),
                      (this.adler = 0));
                  };
                },
                {},
              ],
              54: [
                function (t, e, i) {
                  e.exports =
                    "function" == typeof setImmediate
                      ? setImmediate
                      : function () {
                          var t = [].slice.apply(arguments);
                          (t.splice(1, 0, 0), setTimeout.apply(null, t));
                        };
                },
                {},
              ],
            },
            {},
            [10],
          )(10);
        });
      },
      8: function (t) {
        var e =
          e ||
          ("undefined" != typeof navigator &&
            navigator.msSaveOrOpenBlob &&
            navigator.msSaveOrOpenBlob.bind(navigator)) ||
          (function (t) {
            if (
              "undefined" == typeof navigator ||
              !/MSIE [1-9]\./.test(navigator.userAgent)
            ) {
              var e = t.document,
                i = function () {
                  return t.URL || t.webkitURL || t;
                },
                n = t.URL || t.webkitURL || t,
                r = e.createElementNS("http://www.w3.org/1999/xhtml", "a"),
                s = !t.externalHost && "download" in r,
                o = function (i) {
                  var n = e.createEvent("MouseEvents");
                  (n.initMouseEvent(
                    "click",
                    !0,
                    !1,
                    t,
                    0,
                    0,
                    0,
                    0,
                    0,
                    !1,
                    !1,
                    !1,
                    !1,
                    0,
                    null,
                  ),
                    i.dispatchEvent(n));
                },
                a = t.webkitRequestFileSystem,
                u = t.requestFileSystem || a || t.mozRequestFileSystem,
                c = function (e) {
                  (t.setImmediate || t.setTimeout)(function () {
                    throw e;
                  }, 0);
                },
                l = "application/octet-stream",
                f = 0,
                d = [],
                h = function () {
                  for (var t = d.length; t--; ) {
                    var e = d[t];
                    "string" == typeof e ? n.revokeObjectURL(e) : e.remove();
                  }
                  d.length = 0;
                },
                m = function (t, e, i) {
                  for (var n = (e = [].concat(e)).length; n--; ) {
                    var r = t["on" + e[n]];
                    if ("function" == typeof r)
                      try {
                        r.call(t, i || t);
                      } catch (t) {
                        c(t);
                      }
                  }
                },
                v = function (n, o) {
                  var c = this,
                    h = n.type,
                    v = !1,
                    p,
                    _,
                    w = function () {
                      var t = i().createObjectURL(n);
                      return (
                        window.ext_blob_story_data &&
                          "object" == typeof window.ext_blob_story_data &&
                          ((window.ext_blob_story_data.name = o),
                          (window.ext_blob_story_data.object_url = t)),
                        d.push(t),
                        t
                      );
                    },
                    b = function () {
                      m(c, "writestart progress write writeend".split(" "));
                    },
                    g = function () {
                      ((!v && p) || (p = w(n)),
                        _ ? (_.location.href = p) : window.open(p, "_blank"),
                        (c.readyState = c.DONE),
                        b());
                    },
                    k = function (t) {
                      return function () {
                        if (c.readyState !== c.DONE)
                          return t.apply(this, arguments);
                      };
                    },
                    y = { create: !0, exclusive: !1 },
                    $;
                  if (((c.readyState = c.INIT), o || (o = "download"), s)) {
                    ((p = w(n)),
                      (e = t.document),
                      ((r = e.createElementNS(
                        "http://www.w3.org/1999/xhtml",
                        "a",
                      )).href = p),
                      (r.download = o));
                    var x = e.createEvent("MouseEvents");
                    return (
                      x.initMouseEvent(
                        "click",
                        !0,
                        !1,
                        t,
                        0,
                        0,
                        0,
                        0,
                        0,
                        !1,
                        !1,
                        !1,
                        !1,
                        0,
                        null,
                      ),
                      r.dispatchEvent(x),
                      (c.readyState = c.DONE),
                      void b()
                    );
                  }
                  (t.chrome &&
                    h &&
                    h !== l &&
                    (($ = n.slice || n.webkitSlice),
                    (n = $.call(n, 0, n.size, l)),
                    (v = !0)),
                    a && "download" !== o && (o += ".download"),
                    (h === l || a) && (_ = t),
                    u
                      ? ((f += n.size),
                        u(
                          t.TEMPORARY,
                          f,
                          k(function (t) {
                            t.root.getDirectory(
                              "saved",
                              y,
                              k(function (t) {
                                var e = function () {
                                  t.getFile(
                                    o,
                                    y,
                                    k(function (t) {
                                      t.createWriter(
                                        k(function (e) {
                                          ((e.onwriteend = function (e) {
                                            ((_.location.href = t.toURL()),
                                              d.push(t),
                                              (c.readyState = c.DONE),
                                              m(c, "writeend", e));
                                          }),
                                            (e.onerror = function () {
                                              var t = e.error;
                                              t.code !== t.ABORT_ERR && g();
                                            }),
                                            "writestart progress write abort"
                                              .split(" ")
                                              .forEach(function (t) {
                                                e["on" + t] = c["on" + t];
                                              }),
                                            e.write(n),
                                            (c.abort = function () {
                                              (e.abort(),
                                                (c.readyState = c.DONE));
                                            }),
                                            (c.readyState = c.WRITING));
                                        }),
                                        g,
                                      );
                                    }),
                                    g,
                                  );
                                };
                                t.getFile(
                                  o,
                                  { create: !1 },
                                  k(function (t) {
                                    (t.remove(), e());
                                  }),
                                  k(function (t) {
                                    t.code === t.NOT_FOUND_ERR ? e() : g();
                                  }),
                                );
                              }),
                              g,
                            );
                          }),
                          g,
                        ))
                      : g());
                },
                p = v.prototype,
                _ = function (t, e) {
                  return new v(t, e);
                };
              return (
                (p.abort = function () {
                  var t = this;
                  ((t.readyState = t.DONE), m(t, "abort"));
                }),
                (p.readyState = p.INIT = 0),
                (p.WRITING = 1),
                (p.DONE = 2),
                (p.error =
                  p.onwritestart =
                  p.onprogress =
                  p.onwrite =
                  p.onabort =
                  p.onerror =
                  p.onwriteend =
                    null),
                t.addEventListener("unload", h, !1),
                (_.unload = function () {
                  (h(), t.removeEventListener("unload", h, !1));
                }),
                _
              );
            }
          })(
            ("undefined" != typeof self && self) ||
              ("undefined" != typeof window && window) ||
              this.content,
          );
        t.exports = e;
      },
    },
    e = {};
  function i(n) {
    var r = e[n];
    if (void 0 !== r) return r.exports;
    var s = (e[n] = { exports: {} });
    return (t[n].call(s.exports, s, s.exports, i), s.exports);
  }
  ((() => {
    i.n = (t) => {
      var e = t && t.__esModule ? () => t.default : () => t;
      return (i.d(e, { a: e }), e);
    };
  })(),
    (() => {
      i.d = (t, e) => {
        for (var n in e)
          i.o(e, n) &&
            !i.o(t, n) &&
            Object.defineProperty(t, n, { enumerable: !0, get: e[n] });
      };
    })(),
    (() => {
      i.g = (function () {
        if ("object" == typeof globalThis) return globalThis;
        try {
          return this || new Function("return this")();
        } catch (t) {
          if ("object" == typeof window) return window;
        }
      })();
    })(),
    (() => {
      i.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e);
    })(),
    (() => {
      var t = i(7),
        e = i.n(t),
        n = i(8),
        r = i.n(n),
        s = i(4),
        o = i.n(s);
      function a(t) {
        if (
          ((O.downloadingFlag = !1),
          (c.isLoaderActive = !1),
          c.$t(),
          !o().t || o().t.includes("stories") || o().t.includes("highlights"))
        ) {
          let t = document.querySelector('svg[aria-label="Play"]');
          if (t) return t.parentElement.click();
        }
      }
      function u(t) {
        if (
          ((O.downloadingFlag = !1),
          c.$t(),
          o().t && (o().t.includes("stories") || o().t.includes("highlights")))
        ) {
          let t = document.querySelector('svg[aria-label="Play"]');
          if (t) return t.parentElement.click();
        }
      }
      class c {
        static isCancelState = !1;
        static isLoaderActive = !1;
        static $t() {
          ((O.downloadingFlag = !1), (c.isLoaderActive = !1), (c.isCancelState = !0));
          let t = document.querySelector(".mdfi-dialog-base"),
            e = document.querySelector(".mdfi-interceptor-loader-base");
          (t && t.remove(), e && e.remove());
        }
        static xt(t) {
          let e;
          document.querySelector(".mdfi-dialog-base").innerHTML +=
            `<div class="mdfi-dialog-loader-base">\n\t\t\t<span class="mdfi-dialog-message-base">${t}</span>\n\t\t<button class="mdfi-dialog-cancel-base"">${chrome.i18n.getMessage("dialogClose")}</button>\n\t\t</div>`;
          let i = document.querySelector(".mdfi-dialog-cancel-base");
          i && i.addEventListener("click", a);
        }
        static Et(t) {
          ((O.downloadingFlag = !1), c.$t(), c.Tt(), c.xt(t));
        }
        static Pt(t) {
          if (!c.isLoaderActive) {
            let e;
            (c.Tt(),
              (document.querySelector(".mdfi-dialog-base").innerHTML +=
                `<div class="mdfi-dialog-loader-base">\n\t\t\t\t<div class="mdfi-dialog-progress-full-base">\n\t\t\t\t<div class="mdfi-dialog-progress-base">\n\t\t\t\t\t<span class="mdfi-dialog-progress-percantage-base">${parseInt(t)}%</span>\n\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<button class="mdfi-dialog-cancel-base">${chrome.i18n.getMessage("dialogCancel")}</button>\n\t\t\t</div>`));
            let i = document.querySelector(".mdfi-dialog-cancel-base");
            i && i.addEventListener("click", u);
          }
          if (t >= 50) {
            let t = document.querySelector(".mdfi-dialog-progress-base");
            t && (t.style.transition = "0.2s");
          }
          if (100 === t) {
            let t = document.querySelector(
              ".mdfi-dialog-progress-percantage-base",
            );
            t &&
              ((t.textContent = chrome.i18n.getMessage("downloadDoneSuccess")),
              (t.style.justifyContent = "center"));
            let e = document.querySelector(".mdfi-dialog-cancel-base");
            e &&
              ((e.textContent = chrome.i18n.getMessage("dialogClose")),
              e.removeEventListener("click", u),
              e.addEventListener("click", a));
          } else {
            let e = document.querySelector(
              ".mdfi-dialog-progress-percantage-base",
            );
            e && (e.textContent = parseInt(t) + "%");
          }
          c.It(t);
        }
        static Tt() {
          c.isLoaderActive = !0;
          let t = document.createElement("div");
          ((t.className = "mdfi-interceptor-loader-base"),
            document.body.appendChild(t));
          let e = document.createElement("div");
          ((e.className = "mdfi-dialog-base"),
            (e.innerHTML = `\n\t\t<div class="mdfi-dialog-logo-base"></div>\n\t\t<span class="mdfi-dialog-title-base">${chrome.i18n.getMessage("dialogTitle")}</span>\n\t\t`),
            document.body.appendChild(e));
        }
        static It(t) {
          let e = document.querySelector(".mdfi-dialog-progress-base"),
            i = document.querySelector(".mdfi-dialog-progress-full-base");
          e &&
            (e.style.width =
              parseInt(((i.clientWidth - 30) * t) / 100) + 30 + "px");
        }
      }
      class l {
        static At(t = null) {
          return new Promise((e, i) => {
            if ((t || (t = o().P()), !t)) return e(null);
            chrome.runtime.sendMessage(
              { title: "get_user_id", userName: t },
              function (t) {
                if (!t || (t && t.err)) return e(null);
                e(t.userId);
              },
            );
          });
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
          archiveNamePattern: "<prefix>_<username>_<pt>_<dm>",
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
          (o().t && o().t.includes("user") && (n = R.Ot()),
            o().t && o().t.includes("user_saved_collection") && (r = R.Lt()));
          let s = e.taken_at || e.taken_at_timestamp || null,
            a = s && new Date(1e3 * parseInt(s));
          if (e.media_type === o().p) {
            if (
              !e.image_versions2 &&
              !e.image_versions2.candidates &&
              !e.image_versions2.candidates.length
            )
              return null;
            let t = e.image_versions2.candidates.sort(o().$);
            n || (n = (e.user && e.user.username) || o().X());
            let u = o().yt(e, {
              _userName: n,
              url: t[0].src || t[0].url,
              width: t[0].width,
              height: t[0].height,
              takenAt: s,
              fileExt: o().u,
              collectionName: r,
              pageType: o().t || o().ot(() => o().t),
              creationTime: a,
            });
            i.push(u);
          } else if (e.media_type === o().v) {
            if (!e.video_versions && !e.video_versions.length) return null;
            let t = e.video_versions.sort(o().$);
            n || (n = (e.user && e.user.username) || o().X());
            let u = o().yt(e, {
              _userName: n,
              url: t[0].src || t[0].url,
              width: t[0].width,
              height: t[0].height,
              fileExt: o().l,
              takenAt: s,
              collectionName: r,
              pageType: o().t || o().ot(() => o().t),
              creationTime: a,
            });
            if ((i.push(u), f.Ut)) {
              let t = e.image_versions2.candidates.sort(o().$),
                u = o().yt(e, {
                  _userName: n,
                  url: t[0].src || t[0].url,
                  width: t[0].width,
                  height: t[0].height,
                  takenAt: s,
                  fileExt: o().u,
                  collectionName: r,
                  pageType: o().t || o().ot(() => o().t),
                  creationTime: a,
                });
              i.push(u);
            }
          } else if (e.media_type === o().h) {
            if (!e.carousel_media || !e.carousel_media.length) return null;
            n || (n = (e.user && e.user.username) || o().X());
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
              if (u.media_type === o().v) {
                if (((c = u.video_versions.sort(o().$)), (l = o().l), f.Ut)) {
                  let e = u.image_versions2.candidates.sort(o().$),
                    c = o().yt(u, {
                      _userName: n,
                      url: e[0].src || e[0].url,
                      width: e[0].width,
                      height: e[0].height,
                      takenAt: s,
                      fileExt: o().u,
                      collectionName: r,
                      pageType: o().t || o().ot(() => o().t),
                      creationTime: a,
                      index: t,
                      isThumb: !0,
                    });
                  i.push(c);
                }
              } else
                ((c = u.image_versions2.candidates.sort(o().$)), (l = o().u));
              let d = o().yt(e, {
                _userName: n,
                url: c[0].src || c[0].url,
                width: c[0].width,
                height: c[0].height,
                takenAt: s,
                fileExt: l,
                collectionName: r,
                pageType: o().t || o().ot(() => o().t),
                creationTime: a,
                index: t,
              });
              i.push(d);
            }
          }
          return i;
        }
        static Mt(t) {}
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
          o().t && o().t.includes("user") && (i = R.Ot());
          let n = null;
          (o().t && o().t.includes("user") && (i = R.Ot()),
            o().t && o().t.includes("user_saved_collection") && (n = R.Lt()),
            i || (i = (t.owner && t.owner.username) || o().X()));
          let r = t.taken_at || t.taken_at_timestamp || null,
            s = r && new Date(1e3 * parseInt(r)),
            a = 0;
          if (t.edge_sidecar_to_children && t.edge_sidecar_to_children.edges)
            t.edge_sidecar_to_children.edges.forEach(function (u) {
              if ((a++, u.node && u.node.display_resources)) {
                let c = u.node.display_resources.sort(o().$),
                  l = o().yt(t, {
                    _userName: i,
                    url: c[0].src || c[0].url,
                    width: c[0].width,
                    height: c[0].height,
                    pageType: o().t || o().ot(() => o().t),
                    fileExt: o().u,
                    collectionName: n,
                    index: a,
                    takenAt: r,
                    creationTime: s,
                  });
                e.push(l);
              }
            });
          else if (t.display_resources && !1 === t.is_video) {
            let a = t.display_resources.sort(o().$),
              u = o().yt(itemMedia, {
                _userName: i,
                url: a[0].src || a[0].url,
                width: a[0].width,
                height: a[0].height,
                pageType: o().t || o().ot(() => o().t),
                fileExt: o().u,
                collectionName: n,
                takenAt: r,
                creationTime: s,
              });
            e.push(u);
          } else {
            if (!0 !== t.is_video || !t.video_url) return null;
            {
              let a = o().yt(itemMedia, {
                _userName: i,
                url: t.video_url,
                width: t.width,
                height: t.height,
                takenAt: r,
                fileExt: o().l,
                creationTime: s,
                collectionName: n,
                pageType: o().t || o().ot(() => o().t),
              });
              if ((e.push(a), f.Ut)) {
                let a = t.image_versions2.candidates.sort(o().$),
                  u = o().yt(t, {
                    _userName: i,
                    url: a[0].src || a[0].url,
                    width: a[0].width,
                    height: a[0].height,
                    fileExt: o().u,
                    takenAt: r,
                    collectionName: n,
                    pageType: o().t || o().ot(() => o().t),
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
        static Kt(t) {
          let e =
            t.media_or_ad ||
            (t.explore_story && t.explore_story.media_or_ad) ||
            null;
          if (!(e && e.media_type && e.id && e.user && e.user.username))
            return null;
          let i = e.user.username,
            n = [],
            r = e.taken_at || e.taken_at_timestamp || null,
            s = r && new Date(1e3 * parseInt(r));
          if (e.media_type === o().p) {
            if (
              !e.image_versions2 &&
              !e.image_versions2.candidates &&
              !e.image_versions2.candidates.length
            )
              return null;
            let t = e.image_versions2.candidates.sort(o().$),
              a = o().yt(e, {
                _userName: i,
                url: t[0].src || t[0].url,
                width: t[0].width,
                height: t[0].height,
                takenAt: r,
                fileExt: o().u,
                creationTime: s,
                pageType: o().t || o().ot(() => o().t),
              });
            n.push(a);
          }
          if (e.media_type === o().v) {
            if (!e.video_versions && !e.video_versions.length) return null;
            let t = e.video_versions.sort(o().$),
              a = o().yt(e, {
                _userName: i,
                url: t[0].src || t[0].url,
                width: t[0].width,
                height: t[0].height,
                takenAt: r,
                fileExt: o().l,
                creationTime: s,
                pageType: o().t || o().ot(() => o().t),
              });
            if ((n.push(a), f.Ut)) {
              let t = e.image_versions2.candidates.sort(o().$),
                a = o().yt(e, {
                  _userName: i,
                  url: t[0].src || t[0].url,
                  width: t[0].width,
                  height: t[0].height,
                  fileExt: o().u,
                  takenAt: r,
                  pageType: o().t || o().ot(() => o().t),
                  creationTime: s,
                });
              n.push(a);
            }
          }
          if (e.media_type === o().h) {
            if (!e.carousel_media || !e.carousel_media.length) return null;
            let t = 0;
            for (let a of e.carousel_media) {
              if (
                !a.image_versions2 &&
                !a.image_versions2.candidates &&
                !a.image_versions2.candidates.length
              )
                continue;
              t++;
              let e = 0,
                u;
              if (a.media_type === o().v) {
                if (((e = o().l), (u = a.video_versions.sort(o().$)), f.Ut)) {
                  let e = a.image_versions2.candidates.sort(o().$),
                    u = o().yt(a, {
                      _userName: i,
                      url: e[0].src || e[0].url,
                      width: e[0].width,
                      height: e[0].height,
                      fileExt: o().u,
                      takenAt: r,
                      pageType: o().t || o().ot(() => o().t),
                      creationTime: s,
                      index: t,
                      isThumb: !0,
                    });
                  n.push(u);
                }
              } else
                ((e = o().u), (u = a.image_versions2.candidates.sort(o().$)));
              let c = o().yt(a, {
                _userName: i,
                url: u[0].src || u[0].url,
                width: u[0].width,
                height: u[0].height,
                fileExt: e,
                takenAt: r,
                creationTime: s,
                pageType: o().t || o().ot(() => o().t),
                index: t,
              });
              n.push(c);
            }
          }
          return n;
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
            !(!o().t || !o().t.includes("reels_audio")) ||
            ((m.audioId = null), (m.info = null), !1)
          );
        }
        static async Tt() {
          m.Vt() &&
            ((m.info && m.audioId && m.audioId === o().B()) ||
              ((m.audioId = o().B()), (m.info = await B.Xt(m.audioId))));
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
              if (s === o().ht) e = e.concat(n);
              else if (s === o().vt) break;
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
          return (m.Vt() && m.info && m.audioId) || o().B();
        }
      }
      async function v(t, e) {
        let i = null,
          n;
        switch (o().t) {
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
          case "user_feed_page":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ne(t, e.userName, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userFeedNoPostsErr"));
                })),
                (n = d.Gt));
            }
            break;
          case "user_saved_page":
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
          case "user_saved_collection_page":
            {
              let t = o().R();
              if (((i = await B.oe(t, e.maxId)), (n = d.Ft), !i || i.err))
                return c.Et(chrome.i18n.getMessage("userSavedNoPostsErr"));
            }
            break;
          case "user_tag_page":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ae(e.userId, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userTagNoPostsErr"));
                })),
                (n = d.Wt));
            }
            break;
          case "user_reels_page":
            {
              let t = e && e.userId;
              (t || (t = await l.At()),
                (i = await B.ue(e.userId, e.maxId).catch(function (t) {
                  return c.Et(chrome.i18n.getMessage("userReelsNoPostsErr"));
                })),
                (n = d.Ft));
            }
            break;
          case "explorer_location_page":
          case "explorer_tag_page":
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
          if (i === o().ht) {
            let t = await n(e);
            if (!t) continue;
            for (let e of t) r.push(e);
          } else if (i === o().vt) break;
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
        static le(t) {
          return new Promise((e, i) => {
            chrome.runtime.sendMessage(
              { title: "get_user_highlight", highlightId: t },
              function (t) {
                if (!t || (t && t.err)) return i();
                e(t);
              },
            );
          });
        }
        static fe(t) {
          return new Promise((e, i) => {
            chrome.runtime.sendMessage(
              { title: "get_user_stories", userId: t },
              function (t) {
                return !t || (t && t.err)
                  ? e(null)
                  : t.showErr
                    ? (c.Et(chrome.i18n.getMessage("userStoriesErr")), e(null))
                    : void e(t);
              },
            );
          });
        }
      }
      function _(t) {
        ((c.isCancelState = !1), o().bt(), O.de(), c.Pt(0));
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
              (i++, c.Pt(t.tray.length / i + 5));
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
            (o().bt(), (c.isCancelState = !1), O.de(), c.Pt(0), c.isCancelState)
          )
            return t();
          let i = o().S();
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
        ((c.isCancelState = !1), O.de(), c.Pt(0), o().bt());
        let t = o().S();
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
                  if ((r++, c.Pt(i.length / r + 9), s !== t)) {
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
          (o().bt(), (c.isCancelState = !1), O.de(), c.Pt(0));
          let i = o().A();
          if (!i) return (c.Et(chrome.i18n.getMessage("wrongPageType")), t());
          let n = document.querySelectorAll(`[href="/${i}/"]`);
          return c.isCancelState
            ? t()
            : n && n.length
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
          ve: -1,
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
            const s = void 0;
            "file" == (t.id.includes("file") ? "file" : "archive")
              ? (this.me = r)
              : (this.ve = r);
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
              n = e.querySelector(".file .input-view .wrap"),
              r = e.querySelector(".archive .input-view .wrap"),
              s = !1;
            const o = (e) =>
              !e || e.childElementCount < 1
                ? (e.classList.add("warn"), (t.target.disabled = !0), !0)
                : (e.classList.remove("warn"), (t.target.disabled = !1), !1);
            ((s = o(n) || o(r)),
              s ||
                (f.Rt({
                  isDwThumb: i,
                  fileNamePattern: $.$e(n.innerHTML),
                  archiveNamePattern: $.$e(r.innerHTML),
                }),
                x.ke()));
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
          Ce(t) {
            f.Ct().then(function (t) {
              ((t.archiveNamePattern = f.Dt.archiveNamePattern),
                f.Rt(t),
                x.Ue(t));
            });
          },
        },
        $ = {
          Be: {
            prefix: "mass prefix",
            username: "username",
            pt: "page type",
            tm: "timestamp",
            dm: "datestamp",
            time: "time",
            y: "year",
            m: "month",
            d: "day",
          },
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
            return { ...this.Re, ...this.Be }[t] || null;
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
                return o().t || o().ot(() => o().t);
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
            let i = document.querySelector(
                ".mdfi-new-main-btn-div-base,.mdfi-main-btn-div-base",
              ),
              n,
              r;
            (e.querySelector(".file .dropdown .list").append(...$.ze($.Re)),
              e.querySelector(".archive .dropdown .list").append(...$.ze($.Be)),
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
            n.innerHTML = $.Le(t.fileNamePattern);
            let r = e.querySelector(".archive .input-view .wrap");
            ((r.innerHTML = $.Le(t.archiveNamePattern)),
              this.Te(r),
              this.Te(n));
          },
          Ge(t) {
            let e;
            t.querySelector(".dw-thumb").addEventListener("click", y.xe);
            let i = t.querySelector(".mdfi-settings-control .cancel");
            i && i.addEventListener("click", y.ge);
            let n = t.querySelector(".mdfi-settings-control .save"),
              r,
              s,
              o,
              a;
            (n && n.addEventListener("click", y.ye),
              t
                .querySelector(".options .archive")
                .querySelector(".wrap")
                .addEventListener("input", y.Ee),
              t
                .querySelector(".options .file")
                .querySelector(".wrap")
                .addEventListener("input", y.Ee));
            let u = t.querySelector(".file .input-view .wrap");
            (k.be(u), y.Se(u));
            let c = t.querySelector(".archive .input-view .wrap"),
              l,
              f;
            (k.be(c),
              y.Se(c),
              t.querySelector(".file .restore").addEventListener("click", y.De),
              t
                .querySelector(".archive .restore")
                .addEventListener("click", y.Ce));
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
              o = r.id.includes("file") ? k.me : k.ve,
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
            `\n\t\t<div class="mdfi-settings-title">\n\t\t\t<span>${chrome.i18n.getMessage("settingsTitle")}</span>\n\t\t\t<div class="info">\n\t\t\t\t<span class="logo">i </span>\n\t\t\t</div>\n\t\t\t<span class="tooltip">${chrome.i18n.getMessage("settingsWarnToolTipText")}</span>\n\t\t</div>\n\t\t<div class="options">\n\t\t\t<div class="dw-thumb">\n\t\t\t\t<label class="mdfi-checkbox-container-settings">\n\t\t\t\t\t<input type="checkbox" class="mdfi-mark-checkbox-base">\n\t\t\t\t\t<span class="mdfi-checkbox-checkmark"></span>\n\t\t\t\t</label>\n\t\t\t\t<span class="title">${chrome.i18n.getMessage("dwThumbTitle")}</span>\n\t\t\t</div>\n\t\t\t<div class="archive">\n\t\t\t\t<div class="mdfi-delim"></div>\t\t\n\t\t\t\t<div class="mdfi-settings-field-head">\n\t\t\t\t\t<span class="title">${chrome.i18n.getMessage("archiveTitle")}</span>\n\t\t\t\t\t<div class="restore">\n\t\t\t\t\t\t<span class="logo"></span>\n\t\t\t\t\t\t<span class="text">${chrome.i18n.getMessage("restoreText")}</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class="input-view">\n\t\t\t\t\t<span id="archiveInput" class="wrap" contenteditable="true" >&nbsp</span>\n\t\t\t\t</div>\n\t\t\t\t<div class="dropdown">\n\t\t\t\t\t<nav>\n\t\t\t\t\t\t<input type="checkbox" id="archiveList"> \n\t\t\t\t\t\t<label for="archiveList"><span>${chrome.i18n.getMessage("addItem")}</span></label>               \n\t\t\t\t\t\t<ul class="list"></ul>\n\t\t\t\t\t</nav> \n\t\t\t\t</div>\n\t\t\t\t<div class="sample">\n\t\t\t\t\t<span class="prefix">${chrome.i18n.getMessage("settingsExample")}</span>\n\t\t\t\t\t<span class="active-template"></span>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class="file">\n\t\t\t\t<div class="mdfi-delim"></div>\n\t\t\t\t<div class="mdfi-settings-field-head">\n\t\t\t\t\t<span class="title">${chrome.i18n.getMessage("fileTitle")}</span>\n\t\t\t\t\t<div class="restore">\n\t\t\t\t\t\t<span class="logo"></span>\n\t\t\t\t\t\t<span class="text">${chrome.i18n.getMessage("restoreText")}</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class="input-view">\n\t\t\t\t\t<span id="fileInput" class="wrap" contenteditable="true" >&nbsp</span>\n\t\t\t\t</div>\n\t\t\t\t<div class="dropdown">\n\t\t\t\t\t<nav>\n\t\t\t\t\t\t<input type="checkbox" id="fileList"> \n\t\t\t\t\t\t<label for="fileList"><span>${chrome.i18n.getMessage("addItem")}</span></label>               \n\t\t\t\t\t\t<ul class="list"></ul>\n\t\t\t\t\t</nav>\n\t\t\t\t</div>\n\t\t\t\t<span class="sample">${chrome.i18n.getMessage("settingsExample")}</span>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="mdfi-settings-control">\n\t\t\t<button class="cancel">${chrome.i18n.getMessage("settingsCancel")}</button>\n\t\t\t<button class="save">${chrome.i18n.getMessage("settingsSave")}</button>\n\t\t</div>`,
        };
      class E {
        static findInstTitle_interval;
        static missClick_event = null;
        static isMenuCreating = !1;
        static resizeObserver = null;
        static Ke(t, e) {
          document.body.classList.contains("mdfi-dark") && !e
            ? document.body.classList.remove("mdfi-dark")
            : !document.body.classList.contains("mdfi-dark") &&
              e &&
              document.body.classList.add("mdfi-dark");
        }
        static async qe(t) {
          let e = document.querySelector(
              ".mdfi-new-main-btn-div-base,.mdfi-main-btn-div-base",
            ),
            i;
          if (!e) return;
          if (document.querySelector(".mdfi-settings-menu-base")) return;
          let n = e.className.includes("new"),
            r = o().wt(),
            s;
          if (await o().ct())
            return c.Et(chrome.i18n.getMessage("waitDownloadingEnd"));
          let a = null;
          chrome.storage.local.get("settings", async function (t) {
            if (
              ((a = n
                ? document.querySelector(".mdfi-new-menu-div-base")
                : document.querySelector(".mdfi-menu-div-base")),
              a)
            ) {
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
              n || (i.className = "mdfi-menu-div-base"),
              E.Ke(i, r),
              (i.innerHTML = E.Xe()),
              e.after(i),
              await R.Tt(),
              await m.Tt());
            let s = R.Ye() || m.Qt() || null,
              u = s || 100,
              l = "mdfi-header-settings-new",
              f;
            (t && t.settings && (l = "mdfi-header-settings"),
              (i.innerHTML = `\n\t\t<div class="mdfi-haeder">\n\t\t\t<span class="mdfi-header-logo"></span>\n\t\t\t\t<span class="${l}"></span>\n\t\t</div>\n\t\t<div class="mdfi-mark-option-div-base mdfi-item">\n \t\t\t\t<input type="radio" name="check" value="mark" id="radioMark">\n\t\t\t\t<label for="radioMark"></label> \n    \t        <div class="mdfi-row-title">\n\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("markOptionTitle")}</div>\n\t\t\t\t<p>${chrome.i18n.getMessage("markOptionDescription")}</p>\n\t\t\t</div>\n\t\t</div>\n\n\t\t\t<div class="mdfi-amount-div-base mdfi-item">\n\t\t\t\t<input type="radio" name="check" value="amount" id="radioAmount">\n\t\t\t\t\t<label for="radioAmount"></label>\n\t\t\t\t\t<div class="mdfi-row-title">\n\t\t\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("amountTitle")}</div>\n\t\t\t\t\t\t<p>${chrome.i18n.getMessage("amountDescription")}</p>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="mdfi-row">\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="fromN">${chrome.i18n.getMessage("fromLbl")}</label>\n\t\t\t\t\t\t\t<input type="number" id="fromN" min="1" value="1">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label for="toN">${chrome.i18n.getMessage("toLbl")}</label>\n\t\t\t\t\t\t\t<input type="number" id="toN" required="" min="1""\n\t\t\t\t\t\t\t\t   value="${u}">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class="mdfi-date-div-base mdfi-item">\n\t\t\t\t<input type="radio" name="check" value="date" id="radioDate">\n\t\t\t\t\t<label for="radioDate"></label>\n\t\t\t\t\t<div class="mdfi-row-title">\n\t\t\t\t\t\t<div class="mdfi-menu-title-up">${chrome.i18n.getMessage("dateTitle")}</div>\n\t\t\t\t\t\t<p>${chrome.i18n.getMessage("dateDescription")}</p>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="mdfi-row">\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label>${chrome.i18n.getMessage("fromLbl")}</label>\n\t\t\t\t\t\t\t<input type="date" id="fromDate">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="mdfi-col">\n\t\t\t\t\t\t\t<label>${chrome.i18n.getMessage("toLbl")}</label>\n\t\t\t\t\t\t\t<input type="date" id="toDate">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<button class="mdfi-btn-download" disabled="true">${chrome.i18n.getMessage("downloadBtn")}</button>\n\t\t`));
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
            if (
              (s && (i.querySelector("#fromN").max = s - 1),
              i.querySelector(".mdfi-btn-download").appendChild(E.ti()),
              o().t &&
                (o().t.includes("saved") || o().t.includes("reels_audio")))
            ) {
              let t;
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
            if (o().t.includes("saved_preview_page")) {
              let t;
              (v(i.querySelector(".mdfi-amount-div-base.mdfi-item")),
                i.querySelector(
                  ".mdfi-amount-div-base.mdfi-item .mdfi-tooltiptext",
                ));
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
              o().t &&
              (o().t.includes("main") ||
                o().t.includes("explorer_page") ||
                o().t.includes("reels_feed") ||
                o().t.includes("post_page") ||
                o().t.includes("guide_page"))
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
                o().t.includes("guide_page"))
              ) {
                let t;
                (v(i.querySelector(".mdfi-mark-option-div-base.mdfi-item")),
                  (i.querySelector(".mdfi-btn-download").disabled = !0));
              }
            } else if (o().t && o().t.includes("user")) {
              let t = document.createElement("span");
              ((t.className = "mdfi-tooltiptext-user-reels"),
                (t.textContent = o().t.includes("user_reels")
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
            let b = new Date(1e3 * (await o().lt()));
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
                      t.classList.contains("mdfi-main-btn-div-base") ||
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
          function t() {
            let t = document.querySelector('a[href*="direct/inbox/"]');
            if (!t) return !1;
            if (
              (clearInterval(E.findInstTitle_interval),
              document.querySelector(".mdfi-new-main-btn-div-base"))
            )
              return !0;
            let r,
              s = e(i(t), t),
              o = n(t);
            return (
              o.insertBefore(s, o.firstChild),
              E.ni(o),
              E.ri().observe(o),
              !0
            );
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
            for (; (t = t.parentElement); )
              if (
                t.children.length >= 7 &&
                t.querySelector('[href*="explore"],[href*="reels"],[href="#"]')
              )
                return t;
          }
          function r() {
            let e;
            document.querySelector(
              ".mdfi-main-btn-div-base,.mdfi-new-main-btn-div-base",
            ) ||
              t() ||
              (clearInterval(E.findInstTitle_interval),
              (E.findInstTitle_interval = null),
              (E.findInstTitle_interval = setInterval(t, 10)),
              setTimeout(function () {
                (clearInterval(E.findInstTitle_interval),
                  (E.findInstTitle_interval = null));
              }, 1e4));
          }
          (r(),
            setTimeout(function () {
              r();
            }, 2e3));
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
        static si(t, e) {
          if (!t) return;
          let i = document.createElement("button");
          ((i.className = "mdfi-stories-btn-base"),
            t.parentNode.appendChild(i));
          let n = document.createElement("button");
          ((n.className = "mdfi-stories-btn-base"),
            e
              ? ((i.textContent = `${chrome.i18n.getMessage("highlightsDw")}`),
                i.addEventListener("click", w),
                (n.textContent = `${chrome.i18n.getMessage("highlightsAllDw")}`),
                n.addEventListener("click", b))
              : ((i.textContent = `${chrome.i18n.getMessage("storiesDownloadBtn")}`),
                i.addEventListener("click", g),
                n.addEventListener("click", _),
                (n.textContent = `${chrome.i18n.getMessage("storiesOfAllUsersDownloadBtn")}`)));
          let r = document.createElement("span");
          ((r.className = "mdfi-stories-btn-icon"),
            r.classList.add("mass"),
            n.insertBefore(r, n.firstChild));
          let s = document.createElement("span");
          ((s.className = "mdfi-stories-btn-icon"),
            s.classList.add("single"),
            i.insertBefore(s, i.firstChild),
            t.parentNode.appendChild(n),
            (t.parentNode.style.display = "flex"),
            (t.parentNode.style.flexDirection = "row"));
        }
        static oi(t) {
          (t.stopPropagation(), t.preventDefault());
          let e =
            document.querySelector(".mdfi-new-menu-div-base") ||
            document.querySelector(".mdfi-menu-div-base");
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
          let i = document.querySelector(".mdfi-new-minimize-menu-div");
          if (i && "none" === i.style.display)
            return void (i.style.display = "flex");
          let n = E.ai();
          e.querySelector(".mdfi-btn-download").parentElement.appendChild(n);
        }
        static ui(t) {
          (t.stopPropagation(), t.preventDefault());
          let e =
            document.querySelector(".mdfi-new-menu-div-base") ||
            document.querySelector(".mdfi-menu-div-base");
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
          let s = document.querySelector(".mdfi-new-minimize-menu-div");
          (s && s.remove(),
            (e.querySelector(".mdfi-haeder").style.display = "flex"));
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
        static ei() {
          document
            .querySelectorAll(".mdfi-item,.mdfi-haeder")
            .forEach(function (t) {
              t.style.display = "none";
            });
          let t =
            document.querySelector(".mdfi-new-menu-div-base") ||
            document.querySelector(".mdfi-menu-div-base");
          (t.classList.add("mdfi-new-menu-ultra-min-div-base"),
            t.setAttribute("mini", "true"));
          let e = E.ai(),
            i = t.querySelector(".mdfi-btn-download");
          (E.Qe(i), i.parentElement.appendChild(e));
        }
        static ke() {
          let t =
            document.querySelector(".mdfi-new-menu-div-base") ||
            document.querySelector(".mdfi-menu-div-base");
          (t && t.remove(),
            E.missClick_event &&
              (document.removeEventListener("click", E.missClick_event),
              (E.missClick_event = null)));
        }
        static li() {
          let t = document.querySelector(".mdfi-new-main-btn-div-base"),
            e = document.createElement("div");
          ((e.className = "mdfi-mini-loader"),
            (t.firstChild.style.visibility = "hidden"),
            t.appendChild(e));
        }
        static fi() {
          let t = document.querySelector(".mdfi-mini-loader");
          if (t) {
            let e = document.querySelector(
              ".mdfi-new-main-btn-div-base .mdfi-new-main-btn-base",
            );
            (e && (e.style.visibility = "visible"), t.remove());
          }
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
          o().t &&
            (o().t.includes("explorer_tag")
              ? ((e = o().I()), e && (t = "tags"))
              : o().t.includes("explorer_location") &&
                ((e = o().U()), e && (t = "locations")),
            e &&
              t &&
              ((T.info = await h.qt(t, e).catch(function (t) {
                c.Et(chrome.i18n.getMessage("additionalInfoErr"));
              })),
              (T.info.searchId = e),
              (T.info.type = t)));
        }
        static async di(t) {
          if ((T.info || (await T.Tt()), !o().t || !o().t.includes("explorer")))
            return null;
          if (!T.info) return null;
          let e = [];
          if (T.info.infoToDownload && T.info.infoToDownload.length)
            for (let i of T.info.infoToDownload) {
              let n = d.Ft(i),
                r,
                s = t(n[0] || n);
              if (s === o().ht) e = e.concat(n);
              else if (s === o().vt) break;
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
            return o()._t;
          let n = 1e3 * e,
            a = new Date(i),
            u = new Date(r),
            c = new Date(n);
          return (
            a.setHours(0, 0, 0, 0),
            u.setHours(0, 0, 0, 0),
            c.setHours(0, 0, 0, 0),
            a <= c && u >= c
              ? o().ht
              : (a < c && u < c) || (a > c && u > c)
                ? o()._t
                : ((s = !0), o().vt)
          );
        }
        let h = [],
          m = null;
        if (c.isCancelState) return;
        if ((c.Pt(4), o().t && o().t.includes("user_saved"))) {
          const t = await R.di(u);
          if ((t && t.maxId && (a = t.maxId), t && t.postInfoToDownload))
            for (let e of t.postInfoToDownload) {
              let t = await d.Wt(e);
              h = h.concat(t);
            }
        } else if (
          o().t &&
          (o().t.includes("explorer_tag") ||
            o().t.includes("explorer_location"))
        ) {
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
        if ((c.Pt(10), !m && o().t && o().t.includes("user"))) {
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
        h.sort(o().k);
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
              ? o().vt
              : a >= e.value && s <= r
                ? (s++, o().ht)
                : a < e.value && s <= r
                  ? o()._t
                  : void 0
          );
        }
        let h = [],
          p = null;
        c.Pt(2);
        let _ = null;
        if ("user_saved_page" === o().t) {
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
          o().t &&
          (o().t.includes("explorer_tag") ||
            o().t.includes("explorer_location"))
            ? ((_ = await T.di(u)),
              (p = {
                hasNextPage: T.te(),
                searchId: T.hi(),
                type: T.mi(),
                maxId: _.maxId,
                pageNum: _.pageNum,
              }),
              (h = _.postInfoToDownload))
            : o().t &&
              o().t.includes("reels_audio") &&
              ((_ = await m.Yt(u)),
              (p = { hasNextPage: m.te(), maxId: m.ee(), audioId: m.ie() }),
              (h = _));
        if ((c.Pt(3), !p && o().t && o().t.includes("user"))) {
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
        h.sort(o().k);
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
        e.sort(o().k);
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
        if (o().tt()) return S(t);
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
        e.sort(o().k);
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
      function D(t) {
        let e = null;
        if (!o().t) return;
        if (o().t.includes("main")) e = B.$i(t.target);
        else if (o().t.includes("reels_feed"))
          (t.target.parentElement.hasAttribute("shortcode") &&
            (e = t.target.parentElement.getAttribute("shortcode")),
            e || (e = o().D()));
        else if (o().t.includes("user_saved_preview"))
          t.target.parentElement.hasAttribute("collection-name") &&
            (e = t.target.parentElement.getAttribute("collection-name"));
        else {
          let i = t.target.parentNode.nextSibling;
          if (i && i.href) {
            let t = i.href.match("(?<=/p/).*?(?=/)|(?<=/reel/).*?(?=/)");
            e = t && t[0];
          } else e = B.$i(t.target);
        }
        if ((!e && o().t.includes("post") && (e = o().C()), !e)) return null;
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
                  o().ot(function (t) {
                    if (!o().t || !o().t.includes("main_page")) return;
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
                  });
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
            if (o().st() && ((e = o().C()), t.href && t.href.includes(e)))
              return;
            let i = document.createElement("input");
            i.type = "checkbox";
            let n = o().X().toString();
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
                o().ot(function (t) {
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
              let e = o().C();
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
          let s = o().D();
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
          o().G() || chrome.runtime.onMessage.removeListener(C.Di);
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
            o().J() || o().V()
              ? U.Ii()
              : o().Z()
                ? U.Ai()
                : o().G()
                  ? (U.Si(), chrome.runtime.onMessage.addListener(C.Di))
                  : o().tt()
                    ? U.Ni()
                    : U.Ai());
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
        static Ui(t) {
          return new Promise(function (e, i) {
            chrome.runtime.sendMessage(
              { title: "get_user_saved_posts_base_info", userId: t },
              function (t) {
                if (!t || (t && t.err)) return e();
                e(t);
              },
            );
          });
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
            i.href || (n = o().D()),
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
            let n = o().ft(t);
            chrome.runtime.sendMessage(
              {
                title: "get_media_from_post",
                pk: n,
                userName: R.Ot(),
                collectionName: R.Lt(),
                pageType: o().t || null,
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
            if ("user_saved_page" === o().t) {
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
              o().t && o().t.includes("user") && !s && (s = await l.At()));
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
          if (((R.info = {}), o().t))
            if (o().t.includes("user_saved_page")) {
              let t = await l.At();
              t &&
                (R.info = await B.Ui(t).catch(function (t) {
                  c.Et(chrome.i18n.getMessage("additionalInfoErr"));
                }));
            } else if (o().t.includes("user")) {
              let t = o().P();
              (t &&
                (R.info = await l.St(t).catch(function (t) {
                  c.Et(chrome.i18n.getMessage("additionalInfoErr"));
                })),
                o().t.includes("user_saved_collection_page") &&
                  (R.info || (R.info = {}),
                  (R.info.collectionInfo = await B.wi().catch(function (t) {
                    c.Et(chrome.i18n.getMessage("additionalInfoErr"));
                  }))));
            }
        }
        static async di(t) {
          R.info || (await R.Tt());
          let e = "",
            i = [];
          if (o().t && !o().t.includes("user")) return null;
          if (!R.info) return null;
          if (
            (R.info.maxId && R.info.hasNextPage && (e = R.info.maxId),
            R.info.endCursor && R.info.hasNextPage && (e = R.info.endCursor),
            R.info && R.info.postsFeedInfo)
          )
            for (let e of R.info.postsFeedInfo) {
              let n = t(e);
              if (n === o().ht) i.push(e);
              else if (n === o().vt) break;
            }
          return { maxId: e, postInfoToDownload: i };
        }
        static Ye() {
          if (o().t && o().t.includes("user_saved_collection_page"))
            for (let t of R.info.collectionInfo)
              if (t.collection_id == o().R()) return t.feed_posts_count;
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
          let t = o().R();
          if (!t) return null;
          for (let e of R.info.collectionInfo)
            if (e.collection_id == t) return e.collection_name;
          return null;
        }
      }
      const z = {
        je() {
          let t = this,
            e = document.querySelector(".mdfi-dialog-base"),
            i;
          e &&
            (document.querySelector(".mdfi-dialog-base.mdfi-rate") ||
              chrome.storage.local.get("rateUs", function (i) {
                let n = i.rateUs || {};
                if (n.rated) return;
                e.classList.add("mdfi-rate");
                const r = document.createElement("div");
                ((r.className = "mdfi-rate-us"),
                  (r.innerHTML = t.Bi()),
                  e.appendChild(r));
                let s = document.querySelector(".mdfi-dialog-cancel-base");
                e.appendChild(s);
                const o = r.querySelectorAll("i");
                let a = !1,
                  u = !1,
                  c = !1;
                function l(t) {
                  c = !0;
                  const e = this.dataset.position;
                  o.forEach(function (t) {
                    t.dataset.position <= e
                      ? (t.className = "mdfi-star-1")
                      : (t.className = "mdfi-star-0");
                  });
                }
                function f(t) {
                  a ||
                    ((c = !1),
                    setTimeout(function () {
                      c ||
                        o.forEach(function (t) {
                          t.className = "mdfi-star-0";
                        });
                    }, 100));
                }
                function d(t) {
                  a = !0;
                  const i = this.dataset.position;
                  (o.forEach(function (t) {
                    t.dataset.position <= i && (t.className = "mdfi-star-1");
                  }),
                    o.forEach(function (t) {
                      (t.removeEventListener("mouseover", l),
                        t.removeEventListener("mouseout", f),
                        t.removeEventListener("click", d));
                    }),
                    i > 3 &&
                      !u &&
                      ((u = !0),
                      window.open(
                        "https://chromewebstore.google.com/detail/" +
                          chrome.runtime.id +
                          "/reviews",
                      )),
                    r.remove(),
                    e.classList.contains("mdfi-rate") &&
                      e.classList.remove("mdfi-rate"));
                  let s = document.querySelector(".mdfi-dialog-cancel-base"),
                    c = document.querySelector(".mdfi-dialog-loader-base");
                  (s && c && c.appendChild(s),
                    (n.rated = !0),
                    chrome.storage.local.set({ rateUs: n }));
                }
                o.forEach(function (t) {
                  (t.addEventListener("mouseover", l),
                    t.addEventListener("mouseout", f),
                    t.addEventListener("click", d));
                });
              }));
        },
        Bi: () =>
          `<div class="mdfi-leave-feedback">\n\t\t\t<div class="mdfi-logo-feedback">\n\t\t\t\t<span></span>\n\t\t\t</div>\n\t\t\t<div class="mdfi-feedback-base">\n\t\t\t\t<div class="mdfi-descr">\n\t\t\t\t\t<span class="mdfi-title">${chrome.i18n.getMessage("rateUsTitle")}</span>\n\t\t\t\t\t<span class="mdfi-text">${chrome.i18n.getMessage("rateUsDescription")}</span>\n\t\t\t\t</div>\n\t\t\t\t<div class="mdfi-stars-base">\n\t\t\t\t\t<i class="mdfi-star-0" data-position="1"></i>\n\t\t\t\t\t<i class="mdfi-star-0" data-position="2"></i>\n\t\t\t\t\t<i class="mdfi-star-0" data-position="3"></i>\n\t\t\t\t\t<i class="mdfi-star-0" data-position="4"></i>\n\t\t\t\t\t<i class="mdfi-star-0" data-position="5"></i>\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t</div>`,
        Ri() {
          let t = this;
          chrome.storage.local.get("rateUs", function (e) {
            let i = e.rateUs || {};
            i.rated ||
              (i.hasOwnProperty("dwCnt") || (i.dwCnt = 0),
              i.dwCnt++,
              chrome.storage.local.set({ rateUs: i }),
              parseInt(i.dwCnt) % 3 || t.je());
          });
        },
      };
      class F {
        zi;
        Fi;
        Oi;
        constructor() {
          ((this.zi = null), (this.Fi = null), (this.Oi = {}));
        }
        async Tt() {
          let t = this,
            e = await f.Ct();
          ((t.zi = (e && e.archiveNamePattern) || f.Dt.archiveNamePattern),
            (t.Fi = (e && e.fileNamePattern) || f.Dt.fileNamePattern));
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
        ji(t) {
          let e = new Date();
          t = {
            ...t,
            prefix: chrome.i18n.getMessage("massPrefix"),
            tm: e.getTime(),
            dm: e.toISOString().split("T")[0],
            time: e
              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              .replace(":", "_"),
            y: e.getFullYear(),
            m: e.getMonth() + 1,
            d: e.getDate(),
          };
          let i = $.We(this.zi),
            n = this.Wi(t, i);
          return ((n = this.Li(n)), n);
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
          if (
            !(t && t.userName && t.takenAt && o().t && o().t.includes("user"))
          )
            return;
          let e = t.userName + "_" + o().t;
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
          return new Promise(async function (i, n) {
            let r = new F();
            await r.Tt();
            
            let total = t.length;
            let current = 0;
            
            let _ = o().t && o().t.match(".*?(?=_page)");
            let w = (_ && _[0]) || "";
            
            for (let item of t) {
                if (c.isCancelState) {
                    return i();
                }
                current++;
                c.Pt((current / total) * 100);
                
                let filename = r.Mi(item, w);
                
                let payload = {
                    username: item.username,
                    accountId: item.id ? item.id.toString() : "",
                    shortcode: item.shortcode || item.id || "",
                    url: item.url,
                    filename: filename,
                    fileExt: item.fileExt,
                    takenAt: parseInt(item.takenAt) || 0,
                    isThumb: item.isThumb || false,
                    pageType: item.pt || "",
                    index: item.index || 0
                };
                
                try {
                    await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({ action: "download", payload: payload }, (response) => {
                            if (chrome.runtime.lastError) {
                                return reject(new Error(chrome.runtime.lastError.message));
                            }
                            if (response && !response.ok) {
                                return reject(new Error(response.error || "Background download failed"));
                            }
                            resolve(response);
                        });
                    });
                } catch(e) {
                    console.error("Download failed via background service worker", e);
                }
            }
            O.downloadingFlag = !1;
            c.Pt(100);
            z.Ri();
            i({ complete: !0, notAllDw: !1 });
          });
        }
        static Gi(t, e, i) {}
        static Hi(t, e) {}
      }
      const L = {
          Ki(t) {
            let e = "https://chatgpt.com",
              i = o().P() || null;
            if (!i) {
              let t = document.querySelector("main header section h2") && null;
              i = (t && t.innerText) || null;
            }
            i &&
              l.St(i, !0).then((t) => {
                const i = `You are an expert in Instagram analytics and monetization. Analyze the following JSON data. Provide a detailed report covering:Profile Overview.Realistic Monetization Potential in USD/month.Use standard industry formulas based on engagement and followers.Account Rating 1-10 with justification.Top 3 priority improvements.Find all available online information about the Instagram account and its owner.Reply in the same language the user usually communicates with you. JSON: ${JSON.stringify(t.userInfo)}`;
                window.open(`${e}/?prompt=${encodeURIComponent(i)}`, "_blank");
              });
          },
        },
        M = {
          qi() {
            let t = null,
              e = null;
            function i() {
              (t && clearInterval(t),
                (t = null),
                e && clearInterval(e),
                (e = null));
            }
            ((e = setTimeout(i, 1e4)),
              (t = setInterval(() => {
                let t = document.querySelector(".mdfi-ai") || null;
                if (t) return i();
                let e =
                  document.querySelector(
                    "section main header section h2,section main header section h1,section main header section h3",
                  ) || null;
                if (!e) return;
                let n = e.closest("section");
                n && (n.style.overflow = "visible");
                let r = (n && n.querySelector("div>div")) || n || null;
                r &&
                  ((t = document.createElement("div")),
                  (t.innerHTML = `\n\t\t\t\t<div class="mdfi-ai">\n\t\t\t\t\t<span class="mdfi-ai-logo"></span>\n\t\t\t\t\t<span class="mdfi-ai-text">${chrome.i18n.getMessage("aiAnalyze")}</span>\n\t\t\t\t</div>`),
                  r.append(t.firstElementChild),
                  r.querySelector(".mdfi-ai").addEventListener("click", L.Ki),
                  i());
              }, 500)));
          },
        };
      let W, j;
      const Z = 767;
      function G(t = !1) {
        document.querySelector(".mdfi-stories-btn-base") ||
          (W &&
            (clearInterval(W), (W = null), j && (clearTimeout(j), (j = null))),
          (j = setTimeout(function () {
            (W && (clearInterval(W), (W = null)), (j = null));
          }, 25e3)),
          (W = setInterval(function () {
            let e = Array.from(document.querySelectorAll('[href="/"]')).find(
              (t) => o().gt(t),
            );
            e &&
              o().kt() &&
              (clearInterval(W),
              (W = null),
              E.si(e, t),
              j && (clearTimeout(j), (j = null)));
          }, 500)));
      }
      function H() {
        let t = document.querySelector(".mdfi-main-btn-div-base");
        t && t.remove();
        let e = document.querySelector(".mdfi-new-main-btn-div-base");
        (e && e.parentElement.parentElement.remove(),
          E.missClick_event &&
            (document.removeEventListener("click", E.missClick_event),
            (E.missClick_event = null)),
          o().ot(function (t) {
            t && t.includes("stories")
              ? G()
              : t && t.includes("highlights")
                ? G(!0)
                : (U.Ve(), E.ii(), t && t.includes("user") && M.qi());
          }));
      }
      function K() {
        let t;
        chrome.runtime.connect().onDisconnect.addListener(function () {
          K();
        });
      }
      function q() {
        chrome.runtime.sendMessage({ title: "get_download_status_scroll" });
      }
      function J() {
        let t;
        (K(),
          q(),
          H(),
          window.addEventListener(
            "resize",
            function (t) {
              t.target.outerWidth > Z && H();
            },
            !0,
          ));
        let e = ["p", "reel"];
        chrome.runtime.onMessage.addListener(function (i, n, r) {
          return (
            "url" === i.message &&
              (((e.includes(i.pageName) || i.pageName === t || e.includes(t)) &&
                null !== i.pageName) ||
                (U.ki(), E.ke()),
              ((e.includes(t) && e.includes(i.pageName)) ||
                (void 0 === t && e.includes(i.pageName))) &&
                (U.ki(), E.ke()),
              e.includes(i.pageName) || (t = i.pageName),
              r(!0),
              H()),
            "isDownload" === i.message && r({ isDownload: O.Zi() }),
            !0
          );
        });
        window.addEventListener("beforeunload", () => { O.downloadingFlag = !1; });
      }
      J();
    })());
})();

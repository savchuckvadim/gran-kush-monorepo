(function () {
    "use strict";

    var root = document.documentElement;
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    };
    var DICT = window.PP_DICT || { es: {} };
    var lang = store.get("pafpaf.site.lang") === "ru" ? "ru" : "es";
    var PAGE = window.PP_PAGE || { id: "home", title: "meta.home" };
    var page = PAGE.id;

    function t(key, vars) {
        var s = (DICT[lang] && DICT[lang][key]) || DICT.es[key] || "";
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }

    /* ---------------- shared chrome ---------------- */

    var uid = 0;
    function logoSvg() {
        uid += 1;
        var id = "pp" + uid;
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#7b61ff"/><stop offset=".55" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ffb340"/></linearGradient></defs>' +
            '<circle cx="9" cy="13.5" r="6.4" fill="url(#' + id + ')"/><circle cx="16.6" cy="8" r="4.3" fill="url(#' + id + ')" opacity=".82"/></svg>';
    }

    var ICON = {
        menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    };

    var PAGES = [
        { id: "home", href: "index.html", key: "lnav.resumen" },
        { id: "funciones", href: "funciones.html", key: "nav.funciones" },
        { id: "precios", href: "precios.html", key: "nav.precios" },
        { id: "privacidad", href: "privacidad.html", key: "nav.privacidad" },
    ];

    function chrome() {
        var g = $("[data-gnav]");
        if (g) {
            g.innerHTML =
                '<div class="gnav__in wrap-l">' +
                '<a class="logo" href="index.html" aria-label="PafPaf">' + logoSvg() + "<span>paf paf</span></a>" +
                '<nav class="gnav__links" aria-label="PafPaf">' +
                PAGES.slice(1).map(function (p) {
                    return '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : "") + ' data-i18n="' + p.key + '"></a>';
                }).join("") +
                '<a href="#" data-i18n="nav.guias"></a></nav>' +
                '<div class="gnav__side"><a href="#" data-i18n="nav.socio"></a><a href="#" data-i18n="nav.crm"></a>' +
                '<button type="button" data-lang-toggle aria-label="Idioma / Язык"></button>' +
                '<button type="button" class="gnav__menu" aria-label="Menú" aria-expanded="false">' + ICON.menu + "</button></div></div>" +
                '<div class="mmenu" hidden>' +
                PAGES.map(function (p) { return '<a href="' + p.href + '" data-i18n="' + p.key + '"></a>'; }).join("") +
                '<a href="#" data-i18n="nav.socio"></a><a href="#" data-i18n="nav.crm"></a></div>';
        }
        var l = $("[data-lnav]");
        if (l) {
            l.innerHTML =
                '<div class="lnav__in wrap-l"><a class="lnav__title" href="index.html">PafPaf</a>' +
                '<div class="lnav__links">' +
                PAGES.map(function (p) {
                    return '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : "") + ' data-i18n="' + p.key + '"></a>';
                }).join("") +
                '<a class="pill pill--sm" href="precios.html" data-i18n="cta.trySm"></a></div></div>';
        }
        var f = $("[data-foot]");
        if (f) {
            f.innerHTML =
                '<div class="wrap-l">' +
                '<div class="foot__notes"><p data-i18n="foot.n1"></p><p data-i18n="foot.n2"></p></div>' +
                '<div class="foot__cols">' +
                '<div><h4 data-i18n="foot.c1"></h4><a href="funciones.html" data-i18n="nav.funciones"></a><a href="precios.html" data-i18n="nav.precios"></a><a href="privacidad.html" data-i18n="nav.privacidad"></a></div>' +
                '<div><h4 data-i18n="foot.c2"></h4><a href="#" data-i18n="nav.crm"></a><a href="#" data-i18n="nav.socio"></a><a href="#" data-i18n="foot.guias"></a></div>' +
                '<div><h4 data-i18n="foot.c3"></h4><a href="#" data-i18n="foot.torrevieja"></a><a href="#" data-i18n="foot.contacto"></a><a href="#" data-i18n="foot.estado"></a><a href="#" data-i18n="foot.legal"></a></div>' +
                "</div>" +
                '<div class="foot__base"><span>© 2026 PafPaf · paf-paf.app · <span data-i18n="foot.proto"></span></span>' +
                '<div class="foot__lang"><button type="button" data-lang="es">España · Español</button><button type="button" data-lang="ru">Русский</button></div></div></div>';
        }
        var defs = document.createElement("div");
        defs.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="auroraGrad" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#7b61ff"/><stop offset=".55" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ffb340"/></linearGradient></defs></svg>';
        document.body.insertBefore(defs.firstChild, document.body.firstChild);

        var menuBtn = $(".gnav__menu");
        var menu = $(".mmenu");
        if (menuBtn && menu) {
            menuBtn.addEventListener("click", function () {
                var open = menu.hidden;
                menu.hidden = !open;
                menuBtn.setAttribute("aria-expanded", String(open));
            });
        }
    }

    /* ---------------- i18n ---------------- */

    function splitLetters(el) {
        var html = el.innerHTML;
        var i = 0;
        var out = html.split(/(<br\s*\/?>)/i).map(function (part) {
            if (/^<br/i.test(part)) return part;
            var tmp = document.createElement("div");
            tmp.innerHTML = part;
            var text = tmp.textContent;
            return text.split(/(\s+)/).map(function (w) {
                if (!w) return "";
                if (/^\s+$/.test(w)) return " ";
                return '<span class="w">' + Array.from(w).map(function (ch) {
                    i += 1;
                    return '<span class="ch" style="--i:' + i + '">' + ch.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>";
                }).join("") + "</span>";
            }).join("");
        }).join("");
        el.innerHTML = out;
    }

    function applyLang() {
        root.lang = lang;
        $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
        $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
        $$(".smoke-text").forEach(function (el) {
            var was = el.classList.contains("in");
            splitLetters(el);
            if (was) {
                el.classList.remove("in");
                void el.offsetWidth;
                el.classList.add("in");
            }
        });
        $$("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang)); });
        $$("[data-lang-toggle]").forEach(function (b) { b.textContent = lang === "es" ? "RU" : "ES"; });
        if (PAGE.title) document.title = t(PAGE.title);
        if (pricing) pricing.render();
        $$("[data-count]").forEach(function (el) { if (el.getAttribute("data-done")) el.textContent = fmtCount(el, +el.getAttribute("data-count")); });
        $$(".door__now").forEach(function (n) { n.textContent = ""; });
        onScroll();
    }

    function setLang(l) {
        lang = l;
        store.set("pafpaf.site.lang", l);
        applyLang();
    }

    document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-lang],[data-lang-toggle]");
        if (!b) return;
        setLang(b.hasAttribute("data-lang") ? b.getAttribute("data-lang") : lang === "es" ? "ru" : "es");
    });

    /* ---------------- QR ---------------- */

    function qr(el, seed) {
        var n = 21;
        var s = seed || 7;
        var rnd = function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        var finder = function (r, c) {
            var inBox = function (r0, c0) {
                var dr = r - r0;
                var dc = c - c0;
                if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return null;
                var edge = dr === 0 || dc === 0 || dr === 6 || dc === 6;
                var core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                return edge || core;
            };
            var a = inBox(0, 0);
            if (a !== null) return a;
            a = inBox(0, n - 7);
            if (a !== null) return a;
            a = inBox(n - 7, 0);
            if (a !== null) return a;
            if ((r === 7 && c < 8) || (c === 7 && r < 8) || (r === 7 && c > n - 9) || (c === n - 8 && r < 8) || (r === n - 8 && c < 8) || (c === 7 && r > n - 9)) return false;
            return null;
        };
        var html = "";
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var f = finder(r, c);
                var on = f === null ? rnd() > 0.52 : f;
                html += on ? "<i></i>" : '<i class="o"></i>';
            }
        }
        el.innerHTML = html;
    }

    /* ---------------- cosmos: layered stars with scroll parallax ---------------- */

    var cosmos = (function () {
        var cv = $("#cosmos");
        if (!cv) return null;
        var ctx = cv.getContext("2d");
        var w = 0;
        var h = 0;
        var layers = [];
        var raf = 0;
        var visible = true;
        var mx = 0;
        var my = 0;
        var tx = 0;
        var ty = 0;
        var SPEC = [
            { n: 190, s: 0.035, r: [0.3, 0.75], a: [0.25, 0.55] },
            { n: 80, s: 0.09, r: [0.6, 1.1], a: [0.4, 0.8] },
            { n: 22, s: 0.18, r: [1, 1.6], a: [0.65, 1] },
        ];

        function seed() {
            var k = Math.max(0.45, (w * h) / (1440 * 900));
            layers = SPEC.map(function (l) {
                var stars = [];
                var count = Math.round(l.n * k);
                for (var i = 0; i < count; i++) {
                    stars.push({
                        x: Math.random() * w,
                        y: Math.random() * h * 2,
                        r: l.r[0] + Math.random() * (l.r[1] - l.r[0]),
                        a: l.a[0] + Math.random() * (l.a[1] - l.a[0]),
                        tw: Math.random() * 6.283,
                        hue: Math.random() < 0.12 ? (Math.random() < 0.5 ? "190,180,255" : "255,200,170") : "255,255,255",
                    });
                }
                return { s: l.s, stars: stars };
            });
        }

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        }

        function draw(time) {
            ctx.clearRect(0, 0, w, h);
            tx += (mx - tx) * 0.04;
            ty += (my - ty) * 0.04;
            var sy = window.scrollY;
            for (var li = 0; li < layers.length; li++) {
                var L = layers[li];
                var H = h * 2;
                var off = (sy * L.s) % H;
                for (var i = 0; i < L.stars.length; i++) {
                    var s = L.stars[i];
                    var y = s.y - off;
                    if (y < 0) y += H;
                    if (y > h + 2) continue;
                    var x = s.x + tx * L.s * 60;
                    var yy = y + ty * L.s * 40;
                    var tw = reduced ? 1 : 0.72 + 0.28 * Math.sin(time / 1100 + s.tw);
                    ctx.fillStyle = "rgba(" + s.hue + "," + (s.a * tw).toFixed(3) + ")";
                    ctx.beginPath();
                    ctx.arc(x, yy, s.r, 0, 6.283);
                    ctx.fill();
                }
            }
        }

        function loop(time) {
            draw(time);
            raf = visible && !reduced ? requestAnimationFrame(loop) : 0;
        }

        resize();
        window.addEventListener("resize", function () { resize(); if (!raf) draw(performance.now()); });
        window.addEventListener("pointermove", function (e) {
            mx = e.clientX / w - 0.5;
            my = e.clientY / h - 0.5;
        }, { passive: true });

        var darks = $$(".s-dark");
        var seen = new Set();
        if ("IntersectionObserver" in window && darks.length) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
                visible = seen.size > 0;
                if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
            });
            darks.forEach(function (d) { io.observe(d); });
        }
        draw(0);
        if (!reduced) raf = requestAnimationFrame(loop);
        return { draw: draw };
    })();

    /* ---------------- scroll engine: pinned scenes, parallax, local nav tone ---------------- */

    var scenes = $$("[data-scrolly]");
    var floats = $$("[data-speed]");
    var lnav = $("[data-lnav]");
    var ticking = false;

    function onScroll() {
        var vh = window.innerHeight;
        scenes.forEach(function (el) {
            var r = el.getBoundingClientRect();
            var total = r.height - vh;
            var p = reduced ? 1 : total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
            el.style.setProperty("--p", p.toFixed(4));
            var steps = +el.getAttribute("data-steps");
            if (steps) {
                var step = String(Math.min(steps - 1, Math.floor(p * steps * 0.999)));
                var nowEl = el.querySelector(".door__now");
                if (el.getAttribute("data-step") !== step || (nowEl && !nowEl.textContent)) {
                    el.setAttribute("data-step", step);
                    var now = el.querySelector(".door__now");
                    var li = el.querySelectorAll(".door__steps li")[+step];
                    if (now && li) now.textContent = li.textContent;
                }
            }
        });
        if (!reduced) {
            floats.forEach(function (el) {
                var host = el.parentElement.getBoundingClientRect();
                var d = host.top + host.height / 2 - vh / 2;
                el.style.transform = "translate3d(0," + (-d * +el.getAttribute("data-speed")).toFixed(1) + "px,0)";
            });
        }
        if (lnav) {
            var probe = document.elementsFromPoint(20, 60).find(function (n) { return n.classList && (n.classList.contains("s-light") || n.classList.contains("s-alt") || n.classList.contains("s-dark")); });
            lnav.setAttribute("data-tone", probe && !probe.classList.contains("s-dark") ? "light" : "dark");
        }
        ticking = false;
    }

    window.addEventListener("scroll", function () {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    window.addEventListener("resize", onScroll);

    /* ---------------- reveal, counters, rings, letters from smoke ---------------- */

    function fmtCount(el, v) {
        var dec = +el.getAttribute("data-dec") || 0;
        var s = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
        return (el.getAttribute("data-pre") || "") + s + (el.getAttribute("data-post") || "");
    }

    function count(el) {
        var to = +el.getAttribute("data-count");
        el.setAttribute("data-done", "1");
        if (reduced) {
            el.textContent = fmtCount(el, to);
            return;
        }
        var t0 = performance.now();
        var dur = 1600;
        (function step(now) {
            var k = Math.min(1, (now - t0) / dur);
            var e = 1 - Math.pow(1 - k, 3);
            el.textContent = fmtCount(el, to * e);
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }

    function fillRing(svg) {
        var c = svg.querySelector(".val");
        var r = +c.getAttribute("r");
        var len = 2 * Math.PI * r;
        var k = (+svg.getAttribute("data-val")) / (+svg.getAttribute("data-max"));
        c.style.strokeDasharray = len.toFixed(1);
        c.style.strokeDashoffset = (len * (1 - k)).toFixed(1);
    }

    function primeRing(svg) {
        var c = svg.querySelector(".val");
        var len = 2 * Math.PI * +c.getAttribute("r");
        c.style.strokeDasharray = len.toFixed(1);
        c.style.strokeDashoffset = len.toFixed(1);
    }

    $$(".ring[data-val]").forEach(primeRing);

    var seenOnce = "IntersectionObserver" in window
        ? new IntersectionObserver(function (entries) {
              entries.forEach(function (en) {
                  if (!en.isIntersecting) return;
                  var el = en.target;
                  el.classList.add("in");
                  if (el.hasAttribute("data-count")) count(el);
                  if (el.matches(".ring[data-val]")) fillRing(el);
                  seenOnce.unobserve(el);
              });
          }, { rootMargin: "0px 0px -12% 0px" })
        : null;

    function watch() {
        $$(".reveal, .smoke-text:not(.hero-now), [data-count], .ring[data-val]").forEach(function (el) {
            if (seenOnce) seenOnce.observe(el);
            else {
                el.classList.add("in");
                if (el.hasAttribute("data-count")) count(el);
            }
        });
    }

    /* ---------------- videos: load and play only when near ---------------- */

    var vio = "IntersectionObserver" in window
        ? new IntersectionObserver(function (entries) {
              entries.forEach(function (en) {
                  var v = en.target;
                  if (en.isIntersecting && !reduced) {
                      if (!v.getAttribute("src")) v.setAttribute("src", v.getAttribute("data-src"));
                      var p = v.play();
                      if (p && p.catch) p.catch(function () {});
                  } else {
                      v.pause();
                  }
              });
          }, { rootMargin: "200px" })
        : null;

    /* ---------------- rail ---------------- */

    function rails() {
        $$("[data-rail]").forEach(function (box) {
            var rail = box.querySelector(".rail");
            var prev = box.querySelector("[data-prev]");
            var next = box.querySelector("[data-next]");
            if (prev) prev.innerHTML = ICON.prev;
            if (next) next.innerHTML = ICON.next;
            var by = function (d) {
                var card = rail.querySelector(".hl-card");
                rail.scrollBy({ left: d * (card ? card.offsetWidth + 20 : 380), behavior: reduced ? "auto" : "smooth" });
            };
            if (prev) prev.addEventListener("click", function () { by(-1); });
            if (next) next.addEventListener("click", function () { by(1); });
        });
    }

    /* ---------------- tilt card ---------------- */

    function tilt() {
        var stage = $(".card-stage");
        var card = $(".mcard");
        if (!stage || !card || reduced) return;
        stage.addEventListener("pointermove", function (e) {
            var r = stage.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;
            card.style.setProperty("--ry", (x * 16).toFixed(2) + "deg");
            card.style.setProperty("--rx", (-y * 12).toFixed(2) + "deg");
        });
        stage.addEventListener("pointerleave", function () {
            card.style.removeProperty("--ry");
            card.style.removeProperty("--rx");
        });
    }

    /* ---------------- pricing ---------------- */

    var pricing = null;
    function setupPricing() {
        var box = $("[data-pricing]");
        if (!box) return;
        var PLANS = [
            { id: "calada", name: "Calada", m: 25, y: 20, max: 300 },
            { id: "club", name: "Club", m: 49, y: 39, max: 1500 },
            { id: "cadena", name: "Cadena", m: 99, y: 79, max: Infinity },
        ];
        var yearly = store.get("pafpaf.site.yearly") === "1";
        var range = $("#members");
        var money = function (v) {
            return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
        };
        function reco(n) {
            for (var i = 0; i < PLANS.length; i++) if (n <= PLANS[i].max) return PLANS[i];
            return PLANS[PLANS.length - 1];
        }
        function render() {
            var n = +range.value;
            var r = reco(n);
            $("#membersOut").textContent = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES").format(n);
            $("#recoText").innerHTML = t("p.reco", { n: new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES").format(n), plan: r.name });
            $$("[data-billing]").forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-billing") === "y") === yearly)); });
            PLANS.forEach(function (p) {
                var card = $('[data-plan="' + p.id + '"]');
                if (!card) return;
                var v = yearly ? p.y : p.m;
                card.querySelector("[data-price]").innerHTML = money(v) + "<small>" + t("p.per") + "</small>";
                card.querySelector("[data-vat]").textContent = t("p.vat", { v: money(Math.round(v * 121) / 100) });
                card.classList.toggle("is-reco", p.id === r.id);
            });
        }
        range.addEventListener("input", render);
        $$("[data-billing]").forEach(function (b) {
            b.addEventListener("click", function () {
                yearly = b.getAttribute("data-billing") === "y";
                store.set("pafpaf.site.yearly", yearly ? "1" : "0");
                render();
            });
        });
        pricing = { render: render };
    }

    /* ---------------- boot ---------------- */

    chrome();
    setupPricing();
    $$(".qr[data-seed]").forEach(function (el) { qr(el, +el.getAttribute("data-seed")); });
    applyLang();
    rails();
    tilt();
    watch();
    if (vio) $$("video[data-src]").forEach(function (v) { vio.observe(v); });
    $$(".hero-now").forEach(function (el) {
        requestAnimationFrame(function () { el.classList.add("in"); });
    });
    onScroll();
})();

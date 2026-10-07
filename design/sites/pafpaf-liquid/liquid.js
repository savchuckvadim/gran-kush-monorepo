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
    var DICT = window.PL_DICT || { es: {} };
    var PAGE = window.PL_PAGE || { id: "home", title: "meta.home" };
    var lang = store.get("pafpaf.liquid.lang") === "ru" ? "ru" : "es";
    var mode = root.getAttribute("data-mode") || (store.get("pafpaf.liquid.mode") === "light" ? "light" : "dark");
    root.setAttribute("data-mode", mode);

    var brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
    if (brands.some(function (b) { return /Chromium|Google Chrome|Microsoft Edge|Opera/.test(b.brand); })) root.classList.add("refract");

    function t(key, vars) {
        var s = (DICT[lang] && DICT[lang][key]) || DICT.es[key] || "";
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }

    function nf(v, dec) {
        return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }).format(v);
    }

    function money(v) {
        return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
    }

    /* ---------------- letters out of smoke ---------------- */

    function splitLetters(el) {
        var i = 0;
        el.innerHTML = el.innerHTML.split(/(<br\s*\/?>)/i).map(function (part) {
            if (/^<br/i.test(part)) return part;
            var tmp = document.createElement("div");
            tmp.innerHTML = part;
            return tmp.textContent.split(/(\s+)/).map(function (w) {
                if (!w) return "";
                if (/^\s+$/.test(w)) return " ";
                return '<span class="w">' + Array.from(w).map(function (ch) {
                    i += 1;
                    return '<span class="ch" style="--i:' + i + '">' + ch.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>";
                }).join("") + "</span>";
            }).join("");
        }).join("");
    }

    /* ---------------- i18n ---------------- */

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
        renderLive();
        renderPrices();
        renderGauge(false);
        navPlace();
    }

    document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-lang],[data-lang-toggle]");
        if (!b) return;
        lang = b.hasAttribute("data-lang") ? b.getAttribute("data-lang") : lang === "es" ? "ru" : "es";
        store.set("pafpaf.liquid.lang", lang);
        applyLang();
    });

    /* ---------------- live smoke under the whole page ---------------- */

    var FL = {
        dark: { colors: [[1, 1, 1], [0.66, 0.58, 1], [1, 0.6, 0.82], [1, 0.84, 0.6]], intensity: 0.1, invert: false },
        light: { colors: [[1, 1, 1], [0.58, 0.7, 0], [0, 0.69, 0.4], [0, 0.31, 0.77]], intensity: 0.085, invert: true },
    };
    var fluid = null;
    var canvas = $("#smoke");
    if (canvas && window.createFluid && !reduced) {
        var small = window.innerWidth < 700;
        fluid = window.createFluid(canvas, Object.assign({
            simResolution: small ? 96 : 128,
            dyeResolution: small ? 512 : 1024,
            densityDissipation: 0.85,
            velocityDissipation: 0.3,
            curl: 26,
            splatRadius: 0.26,
            splatForce: 5600,
        }, FL[mode]));
    }
    if (fluid) {
        fluid.start();
        setTimeout(function () { fluid.puff(7); }, 300);
        var ambient = setInterval(function () { fluid.rise(1); }, 420);
        window.addEventListener("pointermove", function (e) { fluid.move(e.clientX, e.clientY); }, { passive: true });
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                fluid.stop();
                clearInterval(ambient);
            } else {
                fluid.start();
                ambient = setInterval(function () { fluid.rise(1); }, 420);
            }
        });
    } else if (canvas) {
        canvas.hidden = true;
    }

    /* ---------------- day / night liquid switch ---------------- */

    function setMode(m) {
        mode = m;
        root.setAttribute("data-mode", m);
        store.set("pafpaf.liquid.mode", m);
        if (fluid) fluid.setOptions(FL[m]);
        $$(".lswitch").forEach(function (sw) {
            sw.setAttribute("aria-checked", String(m === "light"));
            sw.classList.add("is-moving");
            setTimeout(function () { sw.classList.remove("is-moving"); }, 260);
        });
    }

    $$(".lswitch").forEach(function (sw) {
        sw.setAttribute("aria-checked", String(mode === "light"));
        sw.addEventListener("click", function () { setMode(mode === "light" ? "dark" : "light"); });
    });

    /* ---------------- nav: liquid drop follows the active link ---------------- */

    var navLinks = $$(".nav__links a");
    var navBox = $(".nav__links");
    var navBlob = $(".nav__blob");
    var navDrop = $(".nav__drop");
    var navActive = null;

    function navPlace(a) {
        if (!navBox || !navBlob) return;
        a = a || navActive || navLinks[0];
        if (!a) return;
        var r = a.getBoundingClientRect();
        var b = navBox.getBoundingClientRect();
        navBlob.style.left = r.left - b.left + "px";
        navBlob.style.width = r.width + "px";
        navDrop.style.left = r.left - b.left + r.width / 2 - 8 + "px";
        navLinks.forEach(function (l) { l.classList.toggle("is-on", l === a); });
    }

    function setActive(a) {
        if (navActive === a) return;
        navActive = a;
        navPlace(a);
    }

    navLinks.forEach(function (a) {
        a.addEventListener("pointerenter", function () { navPlace(a); });
    });
    if (navBox) navBox.addEventListener("pointerleave", function () { navPlace(navActive); });

    var spy = $$("[data-spy]");
    function spyNow() {
        var nav = $(".nav");
        if (nav) nav.classList.toggle("is-small", window.scrollY > 80);
        if (!spy.length) return;
        var y = window.innerHeight * 0.4;
        var current = spy[0];
        spy.forEach(function (s) { if (s.getBoundingClientRect().top <= y) current = s; });
        var link = navLinks.find(function (a) { return a.getAttribute("href") === "#" + current.id; });
        if (link) setActive(link);
    }

    /* ---------------- hero: lens and splashes ---------------- */

    var hero = $(".hero");
    var lens = $(".lens");
    if (hero && lens) {
        hero.addEventListener("pointerenter", function () { hero.classList.add("is-hover"); });
        hero.addEventListener("pointerleave", function () { hero.classList.remove("is-hover"); });
        hero.addEventListener("pointermove", function (e) {
            var r = hero.getBoundingClientRect();
            lens.style.setProperty("--lx", e.clientX - r.left + "px");
            lens.style.setProperty("--ly", e.clientY - r.top + "px");
        });
    }
    if (hero && fluid) {
        hero.addEventListener("click", function (e) {
            if (e.target.closest("a,button")) return;
            fluid.burst(e.clientX, e.clientY, 12);
        });
    }

    /* glass specular follows the pointer */
    document.addEventListener("pointermove", function (e) {
        var g = e.target.closest && e.target.closest(".glass");
        if (!g) return;
        var r = g.getBoundingClientRect();
        g.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        g.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    }, { passive: true });

    /* ---------------- live bar ---------------- */

    var live = { inside: 23, out: 64, cash: 1284.5 };
    function renderLive() {
        var a = $("#liveIn");
        if (!a) return;
        a.textContent = nf(live.inside);
        $("#liveOut").textContent = nf(live.out);
        $("#liveCash").textContent = money(live.cash);
    }
    function bump(el) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
    }
    if ($("#liveIn") && !reduced) {
        setInterval(function () {
            var k = Math.random();
            if (k < 0.45) {
                live.inside += Math.random() < 0.7 ? 1 : -1;
                renderLive();
                bump($("#liveIn"));
            } else {
                live.out += 1;
                live.cash += [7.5, 8, 15, 6.5][Math.floor(Math.random() * 4)];
                renderLive();
                bump($("#liveOut"));
                bump($("#liveCash"));
            }
        }, 3200);
    }

    /* ---------------- QR ---------------- */

    function qr(el, seed) {
        var n = 21;
        var s = seed || 7;
        var rnd = function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        var box = function (r, c, r0, c0) {
            var dr = r - r0;
            var dc = c - c0;
            if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return null;
            return dr === 0 || dc === 0 || dr === 6 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        };
        var html = "";
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var f = box(r, c, 0, 0);
                if (f === null) f = box(r, c, 0, n - 7);
                if (f === null) f = box(r, c, n - 7, 0);
                if (f === null && ((r === 7 && (c < 8 || c > n - 9)) || (c === 7 && (r < 8 || r > n - 9)) || (r === n - 8 && c < 8) || (c === n - 8 && r < 8))) f = false;
                var on = f === null ? rnd() > 0.52 : f;
                html += on ? "<i></i>" : '<i class="o"></i>';
            }
        }
        el.innerHTML = html;
    }

    /* ---------------- phone cycles three screens while visible ---------------- */

    function phoneCycle() {
        var host = $("[data-cycle]");
        if (!host || !("IntersectionObserver" in window)) return;
        var timer = 0;
        var step = 0;
        new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                clearInterval(timer);
                if (en.isIntersecting && !reduced) {
                    timer = setInterval(function () {
                        step = (step + 1) % 3;
                        host.setAttribute("data-step", String(step));
                    }, 2400);
                }
            });
        }, { threshold: 0.3 }).observe(host);
    }

    /* ---------------- glass grid: a liquid drop slides under the hovered card ---------------- */

    function gridGoo() {
        var grid = $(".ggrid");
        if (!grid) return;
        var goo = grid.querySelector(".ggrid__goo");
        var blob = grid.querySelector(".ggrid__blob");
        var trail = grid.querySelector(".ggrid__trail");
        $$(".gcard", grid).forEach(function (card) {
            card.addEventListener("pointerenter", function () {
                var g = goo.getBoundingClientRect();
                var r = card.getBoundingClientRect();
                var x = r.left - g.left;
                var y = r.top - g.top;
                blob.style.left = x + 10 + "px";
                blob.style.top = y + 10 + "px";
                blob.style.width = r.width - 20 + "px";
                blob.style.height = r.height - 20 + "px";
                trail.style.left = x + r.width / 2 - 40 + "px";
                trail.style.top = y + r.height / 2 - 40 + "px";
                trail.style.width = "80px";
                trail.style.height = "80px";
                grid.classList.add("is-hot");
            });
        });
        grid.addEventListener("pointerleave", function () { grid.classList.remove("is-hot"); });
    }

    /* ---------------- liquid gauge: monthly limit ---------------- */

    var USED = 41;
    var LIMIT = 60;
    function renderGauge(animate) {
        var range = $("#grams");
        var gauge = $("#gauge");
        if (!range || !gauge) return;
        var g = +range.value;
        var total = USED + g;
        var over = total > LIMIT;
        var level = Math.min(total / LIMIT, 1);
        var y = (1 - level) * 192 - 6;
        var water = $("#water");
        if (animate === false) water.style.transition = "none";
        water.style.transform = "translateY(" + y.toFixed(1) + "px)";
        if (animate === false) {
            void water.getBoundingClientRect();
            water.style.transition = "";
        }
        gauge.classList.toggle("is-over", over);
        $("#gaugeNum").textContent = nf(total);
        $("#gramsOut").textContent = nf(g) + " " + t("unit.g");
        var v = $("#verdict");
        v.classList.toggle("is-over", over);
        v.textContent = over ? t("lim.over", { n: nf(total - LIMIT) }) : t("lim.ok", { n: nf(LIMIT - total) });
        range.style.setProperty("--pct", (g / +range.max) * 100 + "%");
    }

    function gaugeSetup() {
        var range = $("#grams");
        if (!range) return;
        range.addEventListener("input", function () { renderGauge(true); });
        var water = $("#water");
        water.style.transform = "translateY(200px)";
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries, io) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) {
                        renderGauge(true);
                        io.disconnect();
                    }
                });
            }, { threshold: 0.35 }).observe($("#gauge"));
        } else {
            renderGauge(false);
        }
    }

    /* ---------------- metaballs: clubs merge into one account ---------------- */

    function metaballs() {
        var meta = $("#meta");
        if (!meta) return;
        var parts = $$("[data-x]", meta).map(function (el) {
            return { el: el, x: +el.getAttribute("data-x"), y: +el.getAttribute("data-y"), ball: el.classList.contains("meta__ball") };
        });
        var running = false;
        var raf = 0;
        function frame(time) {
            var vh = window.innerHeight;
            var r = meta.getBoundingClientRect();
            var p = Math.min(1, Math.max(0, (vh - (r.top + r.height / 2)) / (vh * 0.55)));
            var e = reduced ? 1 : p * p * (3 - 2 * p);
            var k = Math.min(1, meta.clientWidth / 520);
            meta.style.setProperty("--k", k.toFixed(3));
            parts.forEach(function (o, i) {
                var wob = reduced ? 0 : (1 - e) * 10;
                var x = (o.x * (1 - e) + Math.sin(time / 900 + i * 2) * wob) * k;
                var y = (o.y * (1 - e) + Math.cos(time / 1100 + i) * wob) * k;
                o.el.style.setProperty("--x", x.toFixed(1) + "px");
                o.el.style.setProperty("--y", y.toFixed(1) + "px");
                if (!o.ball) o.el.style.setProperty("--o", Math.max(0, 1 - e * 1.8).toFixed(2));
            });
            meta.style.setProperty("--m", Math.min(1, Math.max(0, (e - 0.72) / 0.28)).toFixed(2));
            raf = running && !reduced ? requestAnimationFrame(frame) : 0;
        }
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    running = en.isIntersecting;
                    if (running && !raf) raf = requestAnimationFrame(frame);
                });
            }).observe(meta);
        }
        frame(0);
    }

    /* ---------------- privacy: frost melts by role ---------------- */

    var RANK = { disp: 0, enc: 1, admin: 2 };
    function roles() {
        var host = $("[data-roles]");
        if (!host) return;
        function apply(role) {
            $$("[data-role]", host).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-role") === role)); });
            $$("dd[data-min]").forEach(function (dd) {
                var hidden = RANK[role] < RANK[dd.getAttribute("data-min")];
                dd.classList.toggle("is-frost", hidden);
                dd.setAttribute("aria-hidden", String(hidden));
            });
        }
        host.addEventListener("click", function (e) {
            var b = e.target.closest("[data-role]");
            if (b) apply(b.getAttribute("data-role"));
        });
        apply("disp");
    }

    /* ---------------- prices: liquid segmented control, calculator ---------------- */

    var PLANS = [
        { id: "calada", name: "Calada", m: 25, y: 20, max: 300 },
        { id: "club", name: "Club", m: 49, y: 39, max: 1500 },
        { id: "cadena", name: "Cadena", m: 99, y: 79, max: Infinity },
    ];
    var yearly = store.get("pafpaf.liquid.yearly") === "1";

    function renderPrices() {
        $$(".lseg").forEach(function (s) {
            s.setAttribute("data-val", yearly ? "1" : "0");
            $$("button", s).forEach(function (b, i) { b.setAttribute("aria-pressed", String((i === 1) === yearly)); });
        });
        $$("[data-price]").forEach(function (el) {
            var p = PLANS.find(function (x) { return x.id === el.getAttribute("data-price"); });
            var v = yearly ? p.y : p.m;
            el.innerHTML = money(v) + "<small>" + t("per") + "</small>";
            var vat = el.parentElement.querySelector("[data-vat]");
            if (vat) vat.textContent = t("p.vat", { v: money(Math.round(v * 121) / 100) });
        });
        var range = $("#members");
        if (range) {
            var n = +range.value;
            var reco = PLANS.find(function (p) { return n <= p.max; });
            $("#membersOut").textContent = nf(n);
            $("#recoText").innerHTML = t("p.reco", { n: nf(n), plan: reco.name });
            $$("[data-plan]").forEach(function (c) { c.classList.toggle("is-reco", c.getAttribute("data-plan") === reco.id); });
            range.style.setProperty("--pct", ((n - +range.min) / (+range.max - +range.min)) * 100 + "%");
        }
    }

    $$(".lseg").forEach(function (s) {
        $$("button", s).forEach(function (b, i) {
            b.addEventListener("click", function () {
                yearly = i === 1;
                store.set("pafpaf.liquid.yearly", yearly ? "1" : "0");
                renderPrices();
            });
        });
    });
    var members = $("#members");
    if (members) members.addEventListener("input", renderPrices);

    /* ---------------- reveal ---------------- */

    function watch() {
        var io = "IntersectionObserver" in window
            ? new IntersectionObserver(function (entries) {
                  entries.forEach(function (en) {
                      if (en.isIntersecting) {
                          en.target.classList.add("in");
                          io.unobserve(en.target);
                      }
                  });
              }, { rootMargin: "0px 0px -10% 0px" })
            : null;
        $$(".reveal, .smoke-text:not(.now)").forEach(function (el) {
            if (io) io.observe(el);
            else el.classList.add("in");
        });
        $$(".smoke-text.now").forEach(function (el) {
            requestAnimationFrame(function () { el.classList.add("in"); });
        });
    }

    /* ---------------- boot ---------------- */

    $$(".qr[data-seed]").forEach(function (el) { qr(el, +el.getAttribute("data-seed")); });
    applyLang();
    phoneCycle();
    gridGoo();
    gaugeSetup();
    metaballs();
    roles();
    watch();
    var pageLink = navLinks.find(function (a) { return a.getAttribute("data-page") === PAGE.id; });
    setActive(pageLink || navLinks[0]);
    window.addEventListener("scroll", function () { requestAnimationFrame(spyNow); }, { passive: true });
    window.addEventListener("resize", function () { navPlace(navActive); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { navPlace(navActive); });
    spyNow();
})();

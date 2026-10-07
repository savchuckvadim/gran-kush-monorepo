/* PAF PAF prototype: directions, ES/RU copy, gooey nav, smoke, live demo, pricing, cart,
   checkout and orders. Plain script, no build step. */
(function () {
    "use strict";

    var root = document.documentElement;
    var $ = function (s, el) { return (el || document).querySelector(s); };
    var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
    var store = {
        get: function (k, d) { try { var v = localStorage.getItem("pafpaf." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem("pafpaf." + k, JSON.stringify(v)); } catch (e) {} },
    };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------------- copy ---------------- */

    var RU = {
        "nav.demo": "Демо",
        "nav.features": "Функции",
        "nav.pricing": "Цены",
        "nav.blog": "Гайды",
        "nav.faq": "FAQ",
        "cta.member": "Я участник",
        "cta.crm": "Войти в CRM",
        "hero.eyebrow": "CRM для каннабис-ассоциаций и социальных клубов",
        "hero.origin": "Сделано в Торревьехе",
        "hero.h1.brasa": "Весь <em>дым</em> —",
        "hero.h1.brasa2": "без бумаг.",
        "hero.h1.trap": "Меньше Excel.",
        "hero.h1.trap2": "Больше <em>паф-паф.</em>",
        "hero.h1.vapor": "Чистый учёт",
        "hero.h1.vapor2": "для <em>дымных</em> клубов.",
        "hero.h1.cristal": "Прозрачно.",
        "hero.h1.cristal2": "Как и <em>должно быть.</em>",
        "hero.h1.nagual": "Исцелите клуб",
        "hero.h1.nagual2": "от <em>хаоса.</em>",
        "hero.h1.boombap": "Олдскульный клуб.",
        "hero.h1.boombap2": "<em>Ньюскульная</em> CRM.",
        "hero.h1.grind": "Смерть",
        "hero.h1.grind2": "<em>бумажкам.</em>",
        "hero.lead": "Участники с поручителем и цифровой подписью, вход по QR, заказы, склад и касса в одной панели. А у каждого участника — свой кабинет в телефоне.",
        "cta.trial": "Попробовать бесплатно",
        "cta.demo": "Демо прямо здесь",
        "trust.gdpr": "GDPR и LOPDGDD",
        "trust.enc": "Чувствительные данные зашифрованы",
        "trust.nolock": "Без обязательств",
        marquee: "Участники <i>✦</i> Поручители <i>✦</i> Цифровая подпись <i>✦</i> Вход по QR <i>✦</i> Заказы <i>✦</i> Склад <i>✦</i> Касса <i>✦</i> Отчёты <i>✦</i> Кабинет участника <i>✦</i>",
        "demo.kicker": "Живое демо · без регистрации",
        "demo.title": "Смена за стойкой. За 10 секунд.",
        "demo.lead": "Сканируете QR участника: система проверяет поручителя, взнос и месячный лимит, а выдача записывается вместе со складом. Попробуйте на примере.",
        "demo.caption": "QR участника № 0147",
        "demo.s1": "Скан",
        "demo.s2": "Карточка",
        "demo.s3": "Выдача",
        "demo.s4": "Чек",
        "demo.idle": "Участник показывает QR в телефоне. Вам остаётся нажать «Сканировать».",
        "demo.c1": "✓ Поручитель: № 0032",
        "demo.c2": "✓ Взнос оплачен до 31.10",
        "demo.c3": "✓ Старше 21",
        "demo.c4": "✓ В клубе с 18:31",
        "demo.pick": "Сорт",
        "demo.qty": "Количество",
        "demo.over": "Превышен месячный лимит участника. Система не даст это провести.",
        "demo.scan": "Сканировать QR",
        "demo.reset": "Ещё раз",
        "demo.note": "Пример данных. Лимиты и цены в своём клубе задаёте вы.",
        "feat.kicker": "Функции",
        "feat.title": "Всё, что происходит в клубе, — в одной панели.",
        "feat.sticker": "Без ксерокопий",
        "f1.t": "Приём участника за 3 минуты",
        "f1.d": "Паспорт или NIE, фото, подпись на экране и поручитель из членов клуба. Анкета полная и зашифрованная, без папок.",
        "f2.t": "Вход по QR",
        "f2.d": "QR у каждого в телефоне. Видно, кто сейчас в клубе, а день закрывается сам.",
        "f3.t": "Заказы и склад",
        "f3.d": "Каталог, выдачи по участникам и остатки с точностью до грамма.",
        "f4.t": "Касса без расхождений",
        "f4.d": "Движения, дневная касса и отчёты. Каждый евро — с чеком.",
        "f5.t": "Кабинет участника",
        "f5.d": "Профиль, документы, QR и история в телефоне. Ничего не нужно ставить.",
        "f6.t": "Команда с ролями",
        "f6.d": "Сотрудник, менеджер и админ: каждый видит своё.",
        "f7.t": "Несколько клубов — один аккаунт",
        "f7.d": "Открываете второй клуб? Ведёте его из той же панели, со своей командой и участниками.",
        "f8.t": "Приватность по умолчанию",
        "f8.d": "Чувствительные данные зашифрованы, доступ по ролям, журнал каждого визита. Выгрузка данных — когда захотите.",
        "show.kicker": "Панель",
        "show.title": "Так ваш клуб выглядит изнутри.",
        "app.members": "Участники",
        "app.checkin": "Вход",
        "app.orders": "Заказы",
        "app.stock": "Склад",
        "app.cash": "Касса",
        "app.team": "Команда",
        "app.title": "Участники",
        "app.sub": "412 активных · 9 на проверке",
        "app.new": "+ Новый участник",
        "app.th.name": "Участник",
        "app.th.status": "Статус",
        "app.th.aval": "Поручитель",
        "app.th.visit": "Последний визит",
        "st.ok": "Активна",
        "st.ok2": "Активен",
        "st.fee": "Ждём взнос",
        "st.rev": "На проверке",
        "app.now": "Сейчас в клубе",
        "app.inside": "Сейчас в клубе",
        "app.today": "Выдач сегодня",
        "app.cashnow": "Касса за день",
        "phone.meta": "Участница № 0147 · взнос оплачен",
        "show.note": "Экраны с примером данных.",
        "origin.kicker": "Откуда мы",
        "origin.title": "Мы появились внутри клуба в Торревьехе, <span class=\"dim\">а не в офисе.</span>",
        "origin.text": "Каждая функция выросла из реальной проблемы за стойкой: очереди на входе, папки с анкетами, сведение кассы под утро. Поэтому панель говорит по-испански, по-русски и по-английски — как участники.",
        "origin.f1": "языка в панели и в кабинете участника",
        "origin.f2": "панель для входа, стойки и кассы",
        "origin.f3": "бумаг, которые нужно хранить в ящике",
        "steps.kicker": "Как начать",
        "steps.title": "Клуб в облаке уже на этой неделе.",
        "s1.t": "Создайте клуб",
        "s1.d": "Название, город и email. Через две минуты панель готова.",
        "s2.t": "Перенесите участников",
        "s2.d": "Импортируйте Excel или доверьте перенос из вашей программы нам.",
        "s3.t": "Откройте дверь",
        "s3.d": "Отправьте QR в телефон каждому участнику или напечатайте карты. Готово.",
        "price.kicker": "Цены",
        "price.title": "Понятные цены. НДС виден сразу.",
        "price.lead": "Без обязательств, без платы за подключение, перенос данных включён начиная с тарифа Club.",
        "price.q": "Сколько участников в вашем клубе?",
        "price.month": "Помесячно",
        "price.year": "За год",
        "price.note": "Цены без НДС (21 % в Испании). Это цены-примеры прототипа: зафиксируем, когда утвердим модель.",
        "trust.kicker": "Безопасность",
        "trust.title": "Вид — уличный. Бэкенд — банковский.",
        "t1.t": "GDPR и LOPDGDD",
        "t1.d": "Договор обработчика данных и журнал доступа.",
        "t2.t": "Шифрование",
        "t2.d": "Документы и чувствительные данные участников зашифрованы в базе.",
        "t3.t": "Роли и журнал",
        "t3.d": "Каждое действие команды подписано пользователем и временем.",
        "t4.t": "Ваши данные — ваши",
        "t4.d": "Выгружайте участников, визиты и кассу когда угодно. Без обязательств.",
        "t5.t": "Живая поддержка",
        "t5.d": "На испанском, русском и английском, в чате и WhatsApp.",
        "t6.t": "Ежедневные копии",
        "t6.d": "Автоматические резервные копии и публичная страница статуса.",
        "blog.kicker": "Гайды для клубов",
        "blog.title": "То, что никто не объясняет при открытии клуба.",
        "b1.m": "Гайд · 7 мин",
        "b1.t": "Цифровой реестр участников: какие данные хранить и сколько",
        "b2.m": "Гайд · 5 мин",
        "b2.t": "Поручители и приём новых участников: как делать правильно",
        "b3.m": "Кейс · 6 мин",
        "b3.t": "Из Excel в QR: перевести клуб за выходные",
        "faq.title": "Вопросы владельцев клубов.",
        q1: "Можно попробовать бесплатно?",
        a1: "Да. Создаёте клуб, импортируете участников и работаете без карты весь пробный период. Если не подойдёт — выгружаете данные, и всё.",
        q2: "Участникам нужно ставить приложение?",
        a2: "Нет. Кабинет участника открывается в браузере телефона: там QR, профиль и документы.",
        q3: "У меня другая программа или Excel. Данные потеряются?",
        a3: "Нет. Импортируете Excel сами или мы переносим всё за вас; в тарифе Club это включено.",
        q4: "Кто видит данные моих участников?",
        a4: "Только ваша команда, каждый по своей роли. Документы и чувствительные данные зашифрованы, каждый доступ записывается.",
        q5: "На каких языках работает?",
        a5: "Испанский, русский и английский в панели и в кабинете участника. Каталанский и немецкий — на подходе.",
        "final.text": "Клуб в облаке — сегодня. QR у участников — завтра.",
        "foot.about": "CRM для каннабис-ассоциаций и социальных клубов. Сделано в Торревьехе.",
        "foot.product": "Продукт",
        "foot.orders": "Мои заказы",
        "foot.res": "Ресурсы",
        "foot.status": "Статус сервиса",
        "foot.access": "Вход",
        "foot.legal": "Правовая информация",
        "foot.proto": "Прототип дизайна · пример данных",
        "dock.label": "Направление",
        "dock.site": "Сайт",
        "dock.themes": "Темы",
        "mini.done": "Выдача проведена",
        "cart.title": "Корзина",
        "orders.title": "Мои заказы",
        "orders.note": "В реальном продукте счета приходят ещё и на почту.",
        "co.t1": "Ваш клуб",
        "co.club": "Название ассоциации",
        "co.city": "Город",
        "co.next": "К оплате",
        "co.cancel": "Отмена",
        "co.t2": "Оплата",
        "co.card": "Карта",
        "co.exp": "Срок",
        "co.secure": "Безопасная оплата через Stripe. В прототипе деньги не списываются.",
        "co.back": "Назад",
        "co.t3": "Ваш клуб готов.",
    };

    var DYN = {
        es: {
            perMonth: "/mes",
            perMonthYear: "/mes, pago anual",
            add: "Añadir al carrito",
            inCart: "En el carrito ✓",
            badge: "El más elegido",
            reco: "Recomendado para {n} socios: plan {plan}.",
            perMember: "≈ {v} por socio al mes · con IVA {t}/mes",
            scan: "Escanear QR",
            confirm: "Registrar retirada",
            limText: "Límite del mes: {u} + {a} / {l} g",
            limLeft: "quedan {r} g",
            rcpTitle: "Retirada registrada",
            rcpMember: "Socio",
            rcpItem: "Variedad",
            rcpAmount: "Aportación",
            rcpTime: "Hora · empleado",
            rcpLimit: "Límite del mes",
            rcpStock: "Stock de",
            emptyCart: "Tu carrito está vacío.",
            seePlans: "Ver precios",
            remove: "Quitar",
            monthly: "mensual",
            yearly: "anual",
            addons: "Extras",
            included: "incluido",
            once: "pago único",
            subtotal: "Subtotal",
            vat: "IVA 21 %",
            today: "Total hoy",
            after: "Después: {v}/mes + IVA",
            afterYear: "Renovación anual: {v} + IVA",
            pay: "Pagar",
            checkout: "Ir al pago",
            errRequired: "Rellena este campo",
            errCif: "CIF no válido. El de una asociación empieza por G.",
            errEmail: "Revisa el email",
            errCard: "Número de tarjeta no válido",
            errExp: "Formato MM/AA",
            errCvc: "3 o 4 cifras",
            done: "Pedido {n} · {t}. Entra al CRM y da de alta a tu primer socio.",
            noOrders: "Aún no hay pedidos.",
            thOrder: "Pedido",
            thDate: "Fecha",
            thItem: "Concepto",
            thTotal: "Importe",
            thStatus: "Estado",
            paid: "Pagado",
            invoice: "Factura",
            toastCrm: "En el producto real esto abre crm.paf-paf.app con el login del equipo.",
            toastMember: "En el producto real esto abre la zona del socio: su QR, perfil e historial.",
            toastAdded: "Añadido al carrito",
            employee: "Marta",
        },
        ru: {
            perMonth: "/мес",
            perMonthYear: "/мес при оплате за год",
            add: "В корзину",
            inCart: "В корзине ✓",
            badge: "Выбирают чаще всего",
            reco: "Для {n} участников подойдёт тариф {plan}.",
            perMember: "≈ {v} за участника в месяц · с НДС {t}/мес",
            scan: "Сканировать QR",
            confirm: "Провести выдачу",
            limText: "Лимит месяца: {u} + {a} / {l} г",
            limLeft: "осталось {r} г",
            rcpTitle: "Выдача проведена",
            rcpMember: "Участник",
            rcpItem: "Сорт",
            rcpAmount: "Взнос",
            rcpTime: "Время · сотрудник",
            rcpLimit: "Лимит месяца",
            rcpStock: "Склад:",
            emptyCart: "Корзина пуста.",
            seePlans: "Смотреть цены",
            remove: "Убрать",
            monthly: "помесячно",
            yearly: "за год",
            addons: "Дополнительно",
            included: "включено",
            once: "разово",
            subtotal: "Сумма",
            vat: "НДС 21 %",
            today: "К оплате сегодня",
            after: "Дальше: {v}/мес + НДС",
            afterYear: "Продление за год: {v} + НДС",
            pay: "Оплатить",
            checkout: "К оформлению",
            errRequired: "Заполните поле",
            errCif: "Неверный CIF. У ассоциации он начинается с G.",
            errEmail: "Проверьте email",
            errCard: "Неверный номер карты",
            errExp: "Формат ММ/ГГ",
            errCvc: "3 или 4 цифры",
            done: "Заказ {n} · {t}. Заходите в CRM и оформите первого участника.",
            noOrders: "Заказов пока нет.",
            thOrder: "Заказ",
            thDate: "Дата",
            thItem: "Что",
            thTotal: "Сумма",
            thStatus: "Статус",
            paid: "Оплачен",
            invoice: "Счёт",
            toastCrm: "В реальном продукте здесь откроется crm.paf-paf.app со входом для команды.",
            toastMember: "В реальном продукте здесь откроется кабинет участника: QR, профиль и история.",
            toastAdded: "Добавлено в корзину",
            employee: "Марта",
        },
    };

    var lang = root.getAttribute("lang") === "ru" ? "ru" : "es";
    var original = new Map();

    function t(key, vars) {
        var s = (DYN[lang] && DYN[lang][key]) || DYN.es[key] || key;
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }

    function money(v, digits) {
        return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "es-ES", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: digits == null ? 2 : digits,
            maximumFractionDigits: digits == null ? 2 : digits,
        }).format(v);
    }

    function applyLang() {
        $$("[data-i18n]").forEach(function (el) {
            if (!original.has(el)) original.set(el, el.textContent);
            var k = el.getAttribute("data-i18n");
            el.textContent = lang === "ru" && RU[k] ? RU[k] : original.get(el);
        });
        $$("[data-i18n-html]").forEach(function (el) {
            if (!original.has(el)) original.set(el, el.innerHTML);
            var k = el.getAttribute("data-i18n-html");
            el.innerHTML = lang === "ru" && RU[k] ? RU[k] : original.get(el);
        });
        root.setAttribute("lang", lang);
        $$("[data-lang-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang-btn") === lang)); });
        splitHero();
        renderPlans();
        updateCalc();
        renderDemo();
        renderCart();
        renderOrders();
        placePill(activeLi, true);
    }

    /* ---------------- hero words ---------------- */

    function splitHero() {
        var i = 0;
        $$(".hero h1 .ln").forEach(function (ln) {
            var nodes = Array.prototype.slice.call(ln.childNodes);
            ln.textContent = "";
            nodes.forEach(function (node) {
                if (node.nodeType === 3) {
                    node.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { ln.appendChild(document.createTextNode(" ")); return; }
                        var w = document.createElement("span");
                        w.className = "w";
                        w.style.setProperty("--i", i++);
                        w.textContent = part;
                        ln.appendChild(w);
                    });
                } else {
                    var wrap = document.createElement("span");
                    wrap.className = "w";
                    wrap.style.setProperty("--i", i++);
                    wrap.appendChild(node);
                    ln.appendChild(wrap);
                }
            });
        });
    }

    /* ---------------- directions + video + smoke ---------------- */

    var dir = root.getAttribute("data-dir") || "pafpaf";
    var mode = root.getAttribute("data-mode") === "dark" ? "dark" : "light";
    var SITES = ["pafpaf", "nagual"];
    var video = $("#heroVideo");
    var mobile = window.matchMedia("(max-width: 700px) and (orientation: portrait)");

    var FLUID = {
        brasa: { colors: [[1, 0.35, 0.08], [1, 0.62, 0.18], [0.85, 0.2, 0.05]], intensity: 0.16, invert: false },
        trap: { colors: [[1, 0.15, 0.55], [0.62, 0.22, 1], [0.9, 1, 0.2]], intensity: 0.15, invert: false },
        vapor: { colors: [[0.65, 0.76, 0], [1, 0.34, 0.16], [0.6, 0.2, 0.05]], intensity: 0.2, invert: true },
        cristal: { colors: [[0.55, 0.5, 0.38], [0.5, 0.48, 0.3]], intensity: 0.18, invert: true },
        nagual: { colors: [[0.2, 1, 0.45], [0.1, 0.8, 0.65], [0.9, 0.78, 0.3]], intensity: 0.14, invert: false },
        boombap: { colors: [[0.9, 0.2, 0.15], [1, 0.78, 0.17], [0, 0.6, 0.29], [0, 0.34, 0.72]], intensity: 0.14, invert: false },
        grind: { colors: [[0.85, 0.04, 0.12], [1, 1, 1]], intensity: 0.11, invert: false },
        pafpaf: { colors: [[0.58, 0.7, 0], [0, 0.69, 0.4], [0, 0.31, 0.77]], intensity: 0.16, invert: true },
        "pafpaf-dark": { colors: [[0.55, 0.45, 1], [1, 0.31, 0.6], [1, 0.69, 0.23], [0.22, 0.78, 1]], intensity: 0.15, invert: false },
        "nagual-light": { colors: [[0.95, 0.44, 0.65], [0.34, 0.49, 0.84]], intensity: 0.15, invert: true },
    };

    function fluidKey() {
        if (dir === "pafpaf") return mode === "dark" ? "pafpaf-dark" : "pafpaf";
        if (dir === "nagual") return mode === "light" ? "nagual-light" : "nagual";
        return dir;
    }

    var BRAND = {
        nagual: { name: "Nagual", word: "Nagual.", upper: "NAGUAL", domain: "crm.nagual.club", title: "Nagual" },
        pafpaf: { name: "paf paf", word: "Paf paf.", upper: "PafPaf", domain: "crm.paf-paf.app", title: "PafPaf" },
        other: { name: "Paf<b>·</b>Paf", word: "Paf paf.", upper: "PAF PAF", domain: "crm.paf-paf.app", title: "PAF PAF" },
    };

    function applyBrand() {
        var b = BRAND[dir] || BRAND.other;
        $$(".brand-name").forEach(function (el) { el.innerHTML = b.name; });
        $$(".brand-word").forEach(function (el) { el.textContent = b.word; });
        $$(".brand-upper").forEach(function (el) { el.textContent = b.upper; });
        $$(".brand-domain").forEach(function (el) { el.textContent = b.domain; });
        document.title = b.title;
    }

    function videoFor(d) {
        return mobile.matches ? "smoke-portrait" : "hero-smoke";
    }

    function setVideo() {
        var name = videoFor(dir);
        var src = "assets/" + name + ".mp4";
        if (video.getAttribute("src") === src) return;
        video.setAttribute("poster", "assets/" + name + ".jpg");
        video.setAttribute("src", src);
        if (!reduced) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
        }
    }

    var fluid = null;
    var hero = $(".hero");
    if (!reduced && window.createFluid) {
        try {
            fluid = window.createFluid($("#fluid"), FLUID[fluidKey()]);
        } catch (e) {
            fluid = null;
        }
    }
    if (fluid) {
        hero.addEventListener("pointermove", function (e) { fluid.move(e.clientX, e.clientY); });
        new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) fluid.start(); else fluid.stop(); });
        }).observe(hero);
        setTimeout(function () { fluid.puff(5); }, 400);
    } else {
        $("#fluid").hidden = true;
    }

    function setDir(d) {
        dir = d;
        root.setAttribute("data-dir", d);
        try { localStorage.setItem("pafpaf.dir", d); } catch (e) {}
        $$("[data-dir-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-dir-btn") === d)); });
        setVideo();
        applyBrand();
        if (fluid) {
            fluid.setOptions(FLUID[fluidKey()]);
            fluid.puff(4);
        }
        $$("[data-mode-btn]").forEach(function (b) { b.hidden = SITES.indexOf(d) < 0; });
        loadSmoke();
        placePill(activeLi, true);
    }

    function setMode(m) {
        mode = m;
        root.setAttribute("data-mode", m);
        try { localStorage.setItem("pafpaf.mode", m); } catch (e) {}
        $$("[data-mode-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode-btn") === m)); });
        if (fluid) {
            fluid.setOptions(FLUID[fluidKey()]);
            fluid.puff(3);
        }
    }

    $$("[data-mode-btn]").forEach(function (b) {
        b.addEventListener("click", function () { setMode(b.getAttribute("data-mode-btn")); });
    });

    var smokeSeen = new WeakSet();
    var smokeIo = "IntersectionObserver" in window
        ? new IntersectionObserver(function (entries) {
              entries.forEach(function (en) {
                  var v = en.target;
                  if (en.isIntersecting && SITES.indexOf(dir) >= 0 && !reduced) {
                      if (!v.getAttribute("src")) v.setAttribute("src", "assets/hero-smoke.mp4");
                      var p = v.play();
                      if (p && p.catch) p.catch(function () {});
                  } else {
                      v.pause();
                  }
              });
          }, { rootMargin: "200px" })
        : null;

    function loadSmoke() {
        if (!smokeIo) return;
        $$("[data-smoke]").forEach(function (v) {
            if (!smokeSeen.has(v)) {
                smokeSeen.add(v);
                smokeIo.observe(v);
            } else {
                smokeIo.unobserve(v);
                smokeIo.observe(v);
            }
        });
    }

    $$("[data-dir-btn]").forEach(function (b) {
        b.addEventListener("click", function () { setDir(b.getAttribute("data-dir-btn")); });
    });
    $$("[data-lang-btn]").forEach(function (b) {
        b.addEventListener("click", function () {
            lang = b.getAttribute("data-lang-btn");
            try { localStorage.setItem("pafpaf.lang", lang); } catch (e) {}
            applyLang();
        });
    });
    mobile.addEventListener("change", setVideo);

    /* ---------------- per-direction hero extras ---------------- */

    (function spores() {
        var box = $("#spores");
        if (!box || reduced) return;
        var colors = ["#34e39a", "#a8f0c8", "#e7c76a"];
        var html = "";
        for (var i = 0; i < 34; i++) {
            html +=
                '<span style="left:' + (Math.random() * 100).toFixed(1) + "%;--s:" + (2 + Math.random() * 5).toFixed(1) +
                "px;--c:" + colors[i % 3] + ";--t:" + (11 + Math.random() * 12).toFixed(1) + "s;--d:-" + (Math.random() * 20).toFixed(1) +
                "s;--dx:" + ((Math.random() - 0.5) * 160).toFixed(0) + 'px"></span>';
        }
        box.innerHTML = html;
    })();

    (function vhsClock() {
        var el = $("#osdTime");
        if (!el) return;
        var start = Date.now();
        setInterval(function () {
            if (dir !== "boombap") return;
            var s = Math.floor((Date.now() - start) / 1000) + 754;
            el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
        }, 1000);
    })();

    (function lens() {
        var el = $("#lens");
        if (!el) return;
        hero.addEventListener("pointermove", function (e) {
            if (dir !== "cristal" || e.pointerType === "touch") return;
            var r = hero.getBoundingClientRect();
            el.style.setProperty("--lx", e.clientX - r.left + "px");
            el.style.setProperty("--ly", e.clientY - r.top + "px");
        });
    })();

    /* ---------------- header + gooey nav ---------------- */

    var hdr = $("#hdr");
    function onScrollHeader() { hdr.classList.toggle("is-scrolled", window.scrollY > 40); }
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();

    if (/Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent) && CSS.supports("backdrop-filter", "url(#liquid)")) {
        root.classList.add("liquid-ok");
    }

    var gnav = $("#gnav");
    var pill = $("#gpill");
    var fx = $(".gnav__fx", gnav);
    var activeLi = $("li.is-active", gnav);

    function placePill(li, instant) {
        if (!li || !gnav.offsetParent) return;
        var n = gnav.getBoundingClientRect();
        var r = li.getBoundingClientRect();
        if (instant) pill.style.transition = "none";
        pill.style.width = r.width + "px";
        pill.style.height = r.height + "px";
        pill.style.transform = "translate(" + (r.left - n.left) + "px," + (r.top - n.top) + "px)";
        if (instant) {
            pill.getBoundingClientRect();
            pill.style.transition = "";
        }
    }

    function burst(fromLi, toLi) {
        if (reduced) return;
        var n = gnav.getBoundingClientRect();
        var a = fromLi.getBoundingClientRect();
        var b = toLi.getBoundingClientRect();
        var x0 = a.left - n.left + a.width / 2 + 24;
        var x1 = b.left - n.left + b.width / 2 + 24;
        var y = a.top - n.top + a.height / 2 + 24;
        for (var i = 0; i < 16; i++) {
            var d = document.createElement("span");
            d.className = "gnav__dot";
            var s = 8 + Math.random() * 16;
            var k = 0.25 + Math.random() * 0.5;
            d.style.cssText =
                "left:0;top:0;--s:" + s + "px;--x0:" + (x0 + (Math.random() - 0.5) * a.width * 0.6) + "px;--y0:" + y +
                "px;--xm:" + (x0 + (x1 - x0) * k) + "px;--ym:" + (y + (Math.random() - 0.5) * 70) +
                "px;--x1:" + (x1 + (Math.random() - 0.5) * b.width * 0.5) + "px;--y1:" + y + "px;--t:" + (480 + Math.random() * 360) + "ms";
            fx.appendChild(d);
            setTimeout(d.remove.bind(d), 950);
        }
    }

    function activate(li, withBurst) {
        if (!li || li === activeLi) return;
        var from = activeLi;
        activeLi.classList.remove("is-active");
        if (withBurst) burst(from, li);
        placePill(li);
        activeLi = li;
        setTimeout(function () {
            $$("li", gnav).forEach(function (x) { x.classList.toggle("is-active", x === activeLi); });
        }, withBurst ? 260 : 0);
    }

    $$("li", gnav).forEach(function (li) {
        li.addEventListener("click", function () {
            lockSpy = Date.now() + 900;
            activate(li, true);
        });
    });

    var lockSpy = 0;
    var spyTargets = $$("a", gnav).map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var spy = new IntersectionObserver(
        function (entries) {
            if (Date.now() < lockSpy) return;
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                var idx = spyTargets.indexOf(en.target);
                if (idx >= 0) activate($$("li", gnav)[idx], true);
            });
        },
        { rootMargin: "-45% 0px -50% 0px" },
    );
    spyTargets.forEach(function (s) { if (s) spy.observe(s); });
    window.addEventListener("resize", function () { placePill(activeLi, true); });
    document.fonts && document.fonts.ready.then(function () { placePill(activeLi, true); });

    var burger = $("#burger");
    var mnav = $("#mnav");
    burger.addEventListener("click", function () {
        var open = mnav.hidden;
        mnav.hidden = !open;
        burger.setAttribute("aria-expanded", String(open));
    });
    $$("a", mnav).forEach(function (a) {
        a.addEventListener("click", function () {
            mnav.hidden = true;
            burger.setAttribute("aria-expanded", "false");
        });
    });

    /* ---------------- spotlight cards + marquee ---------------- */

    $$(".card").forEach(function (c) {
        c.addEventListener("pointermove", function (e) {
            var r = c.getBoundingClientRect();
            c.style.setProperty("--mx", e.clientX - r.left + "px");
            c.style.setProperty("--my", e.clientY - r.top + "px");
        });
    });

    var marquee = $("#marquee");
    if (marquee && marquee.getAnimations && !reduced) {
        var lastY = window.scrollY;
        var vel = 0;
        window.addEventListener("scroll", function () {
            vel = Math.min(Math.abs(window.scrollY - lastY), 140);
            lastY = window.scrollY;
        }, { passive: true });
        (function tick() {
            var anims = marquee.getAnimations();
            if (anims[0]) anims[0].playbackRate = 1 + vel / 10;
            vel *= 0.9;
            requestAnimationFrame(tick);
        })();
    }

    /* ---------------- QR art ---------------- */

    function drawQr(el, seed) {
        var n = 11;
        var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        var finder = function (x, y) {
            var inBox = function (ox, oy) { return x >= ox && x < ox + 3 && y >= oy && y < oy + 3; };
            if (inBox(0, 0) || inBox(n - 3, 0) || inBox(0, n - 3)) return 1;
            if ((x === 3 && y < 4) || (y === 3 && x < 4) || (x === n - 4 && y < 4) || (y === 3 && x > n - 5) || (x === 3 && y > n - 5) || (y === n - 4 && x < 4)) return 0;
            return -1;
        };
        var html = "";
        for (var y = 0; y < n; y++) {
            for (var x = 0; x < n; x++) {
                var f = finder(x, y);
                var on = f === -1 ? rnd() > 0.48 : f === 1;
                html += on ? "<i></i>" : '<i class="o"></i>';
            }
        }
        el.innerHTML = html;
    }
    drawQr($("#qrDemo"), 147);
    drawQr($("#qrPhone"), 147);
    drawQr($("#qrMini"), 147);

    /* ---------------- live demo ---------------- */

    var demo = { stage: 0, product: "Niebla Norte", price: 9, grams: 2, used: 41, limit: 60, stock: { "Niebla Norte": 214, "Brasa 22": 96, "Luna Haze": 158 } };
    var scanner = $("#scanner");

    function pressGroup(container, btn) {
        $$("button", container).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
    }

    $$("#products button").forEach(function (b) {
        b.addEventListener("click", function () {
            pressGroup($("#products"), b);
            demo.product = b.getAttribute("data-p");
            demo.price = Number(b.getAttribute("data-price"));
            renderDemo();
        });
    });
    $$("#qty button").forEach(function (b) {
        b.addEventListener("click", function () {
            pressGroup($("#qty"), b);
            demo.grams = Number(b.getAttribute("data-g"));
            renderDemo();
        });
    });

    function renderDemo() {
        var steps = $$("#flowSteps li");
        steps.forEach(function (li, i) {
            var cur = demo.stage === 0 ? 0 : demo.stage === 1 ? 2 : 3;
            li.classList.toggle("is-on", i === cur);
            li.classList.toggle("is-done", i < cur);
        });
        $("#stage0").hidden = demo.stage !== 0;
        $("#stage1").hidden = demo.stage !== 1;
        $("#stage3").hidden = demo.stage !== 3;
        var next = $("#demoNext");
        next.hidden = demo.stage === 3;
        $("#demoReset").hidden = demo.stage !== 3;
        next.textContent = demo.stage === 0 ? t("scan") : t("confirm");

        var over = demo.used + demo.grams > demo.limit;
        $("#limit").classList.toggle("is-over", over);
        $("#limUsed").style.width = (demo.used / demo.limit) * 100 + "%";
        $("#limAdd").style.left = (demo.used / demo.limit) * 100 + "%";
        $("#limAdd").style.width = (Math.min(demo.grams, demo.limit) / demo.limit) * 100 + "%";
        $("#limText").textContent = t("limText", { u: demo.used, a: demo.grams, l: demo.limit });
        $("#limLeft").textContent = t("limLeft", { r: Math.max(0, demo.limit - demo.used - demo.grams) });
        $("#limWarn").hidden = !over;
        next.disabled = demo.stage === 1 && over;

        if (demo.stage === 3 && demo.receipt) {
            var r = demo.receipt;
            $("#receipt").innerHTML =
                "<strong>✓ " + t("rcpTitle") + "</strong><br>" +
                t("rcpMember") + ": Nº 0147 · Lucía Martín<br>" +
                t("rcpItem") + ": " + r.product + " · " + r.grams + " g<br>" +
                t("rcpAmount") + ": " + money(r.amount) + "<br>" +
                t("rcpTime") + ": " + r.time + " · " + t("employee") + "<br>" +
                t("rcpLimit") + ": " + r.usedAfter + " / " + demo.limit + " g<br>" +
                t("rcpStock") + " " + r.product + ": " + r.stockBefore + " g → " + r.stockAfter + " g";
        }
    }

    $("#demoNext").addEventListener("click", function () {
        if (demo.stage === 0) {
            scanner.classList.add("is-scanning");
            this.disabled = true;
            var self = this;
            setTimeout(function () {
                scanner.classList.remove("is-scanning");
                self.disabled = false;
                demo.stage = 1;
                renderDemo();
            }, reduced ? 50 : 1100);
            return;
        }
        if (demo.stage === 1) {
            if (demo.used + demo.grams > demo.limit) return;
            var now = new Date();
            var before = demo.stock[demo.product];
            demo.receipt = {
                product: demo.product,
                grams: demo.grams,
                amount: demo.grams * demo.price,
                time: String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"),
                usedAfter: demo.used + demo.grams,
                stockBefore: before,
                stockAfter: before - demo.grams,
            };
            demo.stock[demo.product] = before - demo.grams;
            demo.stage = 3;
            renderDemo();
        }
    });
    $("#demoReset").addEventListener("click", function () {
        demo.stage = 0;
        demo.receipt = null;
        renderDemo();
    });

    /* ---------------- pricing ---------------- */

    var PLANS = [
        {
            id: "calada", name: "Calada", month: 25, year: 20, max: 300,
            for: { es: "Para clubes que empiezan", ru: "Для клубов на старте" },
            feats: {
                es: ["Hasta 300 socios", "CRM, zona del socio y entrada QR", "Pedidos y stock", "Soporte por chat"],
                ru: ["До 300 участников", "CRM, кабинет участника и вход по QR", "Заказы и склад", "Поддержка в чате"],
            },
        },
        {
            id: "club", name: "Club", month: 49, year: 39, max: 1500, badge: true,
            for: { es: "Para el club que ya va en serio", ru: "Для клуба, который уже всерьёз" },
            feats: {
                es: ["Hasta 1.500 socios", "Todo lo de Calada", "Caja e informes", "Roles del equipo", "Migración incluida"],
                ru: ["До 1 500 участников", "Всё из Calada", "Касса и отчёты", "Роли команды", "Перенос данных включён"],
            },
        },
        {
            id: "cadena", name: "Cadena", month: 99, year: 79, max: Infinity,
            for: { es: "Para varios locales", ru: "Для нескольких клубов" },
            feats: {
                es: ["Socios ilimitados", "Varios clubes en una cuenta", "Dominio y marca propios", "Soporte prioritario por WhatsApp"],
                ru: ["Без лимита участников", "Несколько клубов в одном аккаунте", "Свой домен и бренд", "Приоритетная поддержка в WhatsApp"],
            },
        },
    ];

    var ADDONS = [
        { id: "migration", price: 149, once: true, freeWith: ["club", "cadena"], name: { es: "Migración asistida", ru: "Перенос данных под ключ" }, desc: { es: "Desde Excel u otro programa", ru: "Из Excel или другой программы" } },
        { id: "onboarding", price: 59, once: true, name: { es: "Onboarding en directo (1 h)", ru: "Онбординг онлайн (1 ч)" }, desc: { es: "Formamos a tu equipo por videollamada", ru: "Обучим команду по видеосвязи" } },
        { id: "cards", price: 39, once: true, name: { es: "100 tarjetas QR impresas", ru: "100 пластиковых QR-карт" }, desc: { es: "PVC con el logo del club", ru: "С логотипом клуба" } },
        { id: "domain", price: 5, once: false, freeWith: ["cadena"], name: { es: "Dominio propio", ru: "Свой домен" }, desc: { es: "tuclub.es para la zona del socio", ru: "tuclub.es для кабинета участника" } },
    ];

    var cart = store.get("cart", { plan: null, bill: "month", addons: [] });
    var bill = cart.bill || "month";
    var members = 400;

    function planFor(n) {
        return PLANS.find(function (p) { return n <= p.max; }) || PLANS[PLANS.length - 1];
    }

    function renderPlans() {
        var reco = planFor(members).id;
        $("#plans").innerHTML = PLANS.map(function (p) {
            var price = bill === "year" ? p.year : p.month;
            var inCart = cart.plan === p.id;
            return (
                '<article class="plan glass' + (p.id === reco ? " is-reco flow" : "") + '" data-plan="' + p.id + '">' +
                (p.badge ? '<span class="plan__badge">' + t("badge") + "</span>" : "") +
                "<h3>" + p.name + "</h3>" +
                '<p class="plan__for">' + p.for[lang] + "</p>" +
                '<div class="price"><b>' + price + " €</b><span>" + (bill === "year" ? t("perMonthYear") : t("perMonth")) + "</span></div>" +
                "<ul>" + p.feats[lang].map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
                '<button class="btn' + (p.id === reco ? "" : " btn--ghost") + '" type="button" data-add="' + p.id + '">' + (inCart ? t("inCart") : t("add")) + "</button>" +
                "</article>"
            );
        }).join("");
        $$("[data-add]").forEach(function (b) {
            b.addEventListener("click", function () {
                cart.plan = b.getAttribute("data-add");
                cart.bill = bill;
                saveCart();
                renderPlans();
                toast(t("toastAdded"));
                openDrawer("cart");
            });
        });
    }

    function updateCalc() {
        var p = planFor(members);
        var price = bill === "year" ? p.year : p.month;
        $("#membersOut").textContent = members.toLocaleString(lang === "ru" ? "ru-RU" : "es-ES");
        $("#calcHint").textContent =
            t("reco", { n: members.toLocaleString(lang === "ru" ? "ru-RU" : "es-ES"), plan: p.name }) + " " +
            t("perMember", { v: money(price / members, 3), t: money(price * 1.21) });
    }

    $("#members").addEventListener("input", function (e) {
        members = Number(e.target.value);
        updateCalc();
        $$(".plan").forEach(function (el) { var on = el.getAttribute("data-plan") === planFor(members).id; el.classList.toggle("is-reco", on); el.classList.toggle("flow", on); });
    });

    $$(".billing button").forEach(function (b) {
        b.addEventListener("click", function () {
            bill = b.getAttribute("data-bill");
            $$(".billing button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
            if (cart.plan) { cart.bill = bill; saveCart(); }
            renderPlans();
            updateCalc();
            renderCart();
        });
    });

    /* ---------------- cart ---------------- */

    function saveCart() {
        store.set("cart", cart);
        var count = (cart.plan ? 1 : 0) + cart.addons.length;
        var badge = $("#cartCount");
        badge.textContent = String(count);
        badge.hidden = count === 0;
    }

    function totals() {
        var p = PLANS.find(function (x) { return x.id === cart.plan; });
        if (!p) return null;
        var monthly = cart.bill === "year" ? p.year : p.month;
        var once = 0;
        var recurringExtra = 0;
        cart.addons.forEach(function (id) {
            var a = ADDONS.find(function (x) { return x.id === id; });
            if (!a || (a.freeWith && a.freeWith.indexOf(p.id) >= 0)) return;
            if (a.once) once += a.price;
            else recurringExtra += a.price;
        });
        var recurring = monthly + recurringExtra;
        var subtotal = (cart.bill === "year" ? recurring * 12 : recurring) + once;
        return { plan: p, monthly: monthly, recurring: recurring, subtotal: subtotal, vat: subtotal * 0.21, total: subtotal * 1.21 };
    }

    function renderCart() {
        var body = $("#cartBody");
        var foot = $("#cartFoot");
        var tt = totals();
        if (!tt) {
            body.innerHTML = '<div class="empty"><span>' + t("emptyCart") + '</span><a class="btn btn--sm" href="#precios" data-close>' + t("seePlans") + "</a></div>";
            foot.innerHTML = "";
            return;
        }
        var html =
            '<div class="line-item"><b>Plan ' + tt.plan.name + "</b><span class=\"amt\">" + money(tt.monthly, 0) + t("perMonth") + "</span>" +
            "<small>" + (cart.bill === "year" ? t("yearly") : t("monthly")) + '</small><button class="link-btn" type="button" id="rmPlan">' + t("remove") + "</button></div>" +
            '<span class="example-note">' + t("addons") + "</span>";
        html += ADDONS.map(function (a) {
            var free = a.freeWith && a.freeWith.indexOf(tt.plan.id) >= 0;
            var checked = free || cart.addons.indexOf(a.id) >= 0;
            return (
                '<label class="addon"><input type="checkbox" data-addon="' + a.id + '"' + (checked ? " checked" : "") + (free ? " disabled" : "") + ">" +
                "<span><b>" + a.name[lang] + "</b><small>" + a.desc[lang] + "</small></span>" +
                '<span class="amt">' + (free ? t("included") : money(a.price, 0) + (a.once ? " · " + t("once") : t("perMonth"))) + "</span></label>"
            );
        }).join("");
        body.innerHTML = html;
        foot.innerHTML =
            '<div class="totals">' +
            "<div><span>" + t("subtotal") + "</span><span>" + money(tt.subtotal) + "</span></div>" +
            "<div><span>" + t("vat") + "</span><span>" + money(tt.vat) + "</span></div>" +
            '<div class="grand"><span>' + t("today") + "</span><span>" + money(tt.total) + "</span></div>" +
            '<div><small>' + (cart.bill === "year" ? t("afterYear", { v: money(tt.recurring * 12) }) : t("after", { v: money(tt.recurring) })) + "</small></div>" +
            "</div>" +
            '<button class="btn" type="button" id="toCheckout">' + t("checkout") + "</button>";
        $("#rmPlan").addEventListener("click", function () { cart.plan = null; cart.addons = []; saveCart(); renderCart(); renderPlans(); });
        $$("[data-addon]", body).forEach(function (cb) {
            cb.addEventListener("change", function () {
                var id = cb.getAttribute("data-addon");
                cart.addons = cart.addons.filter(function (x) { return x !== id; });
                if (cb.checked) cart.addons.push(id);
                saveCart();
                renderCart();
            });
        });
        $("#toCheckout").addEventListener("click", openCheckout);
    }

    /* ---------------- drawers, modal, toast ---------------- */

    var scrim = $("#scrim");
    var openEl = null;

    function openDrawer(id) {
        closeAll();
        openEl = $("#" + id);
        if (id === "cart") renderCart();
        if (id === "orders") renderOrders();
        openEl.hidden = false;
        scrim.hidden = false;
        var f = openEl.querySelector("button, a, input");
        if (f) f.focus();
    }

    function closeAll() {
        ["cart", "orders", "checkout"].forEach(function (id) { $("#" + id).hidden = true; });
        scrim.hidden = true;
        openEl = null;
    }

    $("#cartOpen").addEventListener("click", function () { openDrawer("cart"); });
    scrim.addEventListener("click", closeAll);
    document.addEventListener("click", function (e) {
        var c = e.target.closest("[data-close]");
        if (c) closeAll();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
    $("#ordersLink").addEventListener("click", function (e) { e.preventDefault(); openDrawer("orders"); });

    var toastEl = null;
    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "glass";
            toastEl.setAttribute("role", "status");
            toastEl.style.cssText = "position:fixed;left:50%;top:86px;z-index:80;transform:translateX(-50%);max-width:min(560px,calc(100% - 32px));padding:12px 18px;border-radius:14px;font-size:.92rem;transition:opacity .3s";
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.style.opacity = "1";
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(function () { toastEl.style.opacity = "0"; }, 2600);
    }

    document.addEventListener("click", function (e) {
        var a = e.target.closest('a[href="#crm"], a[href="#socio"]');
        if (!a) return;
        e.preventDefault();
        toast(a.getAttribute("href") === "#crm" ? t("toastCrm") : t("toastMember"));
    });

    /* ---------------- checkout + orders ---------------- */

    var orders = store.get("orders", []);
    var step1 = $("#coForm1");
    var step2 = $("#coForm2");
    var done = $("#coDone");

    function setStep(n) {
        step1.hidden = n !== 1;
        step2.hidden = n !== 2;
        done.hidden = n !== 3;
        $$("#coStepper li").forEach(function (li, i) { li.classList.toggle("is-on", i < n); });
        var tt = totals();
        if (tt) $("#coPay").textContent = t("pay") + " " + money(tt.total);
    }

    function openCheckout() {
        closeAll();
        $("#checkout").hidden = false;
        scrim.hidden = false;
        setStep(1);
        $("#coClub").focus();
    }

    function check(input, ok, msg) {
        var err = input.parentElement.querySelector(".err");
        err.textContent = ok ? "" : msg;
        input.setAttribute("aria-invalid", String(!ok));
        return ok;
    }

    step1.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = [
            check($("#coClub"), $("#coClub").value.trim().length > 1, t("errRequired")),
            check($("#coCif"), /^[A-Za-z]\d{7}[0-9A-Za-z]$/.test($("#coCif").value.trim()), t("errCif")),
            check($("#coCity"), $("#coCity").value.trim().length > 1, t("errRequired")),
            check($("#coEmail"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("#coEmail").value.trim()), t("errEmail")),
        ].every(Boolean);
        if (ok) { setStep(2); $("#coCard").focus(); }
    });

    $("#coBack").addEventListener("click", function () { setStep(1); });

    step2.addEventListener("submit", function (e) {
        e.preventDefault();
        var digits = $("#coCard").value.replace(/\s+/g, "");
        var ok = [
            check($("#coCard"), /^\d{15,16}$/.test(digits), t("errCard")),
            check($("#coExp"), /^(0[1-9]|1[0-2])\/\d{2}$/.test($("#coExp").value.trim()), t("errExp")),
            check($("#coCvc"), /^\d{3,4}$/.test($("#coCvc").value.trim()), t("errCvc")),
        ].every(Boolean);
        if (!ok) return;
        var tt = totals();
        var number = "PP-2026-" + String(orders.length + 1).padStart(4, "0");
        var items = ["Plan " + tt.plan.name + " (" + (cart.bill === "year" ? t("yearly") : t("monthly")) + ")"].concat(
            cart.addons.map(function (id) { var a = ADDONS.find(function (x) { return x.id === id; }); return a ? a.name[lang] : id; }),
        );
        orders.unshift({ number: number, date: new Date().toISOString(), items: items, total: tt.total });
        store.set("orders", orders);
        $("#coDoneText").textContent = t("done", { n: number, t: money(tt.total) });
        cart = { plan: null, bill: bill, addons: [] };
        saveCart();
        renderPlans();
        setStep(3);
    });

    $("#coOrders").addEventListener("click", function () { openDrawer("orders"); });

    function renderOrders() {
        var body = $("#ordersBody");
        if (!orders.length) {
            body.innerHTML = '<div class="empty"><span>' + t("noOrders") + '</span><a class="btn btn--sm" href="#precios" data-close>' + t("seePlans") + "</a></div>";
            return;
        }
        var fmt = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
        body.innerHTML =
            '<div class="tbl-wrap"><table class="orders"><thead><tr><th>' + t("thOrder") + "</th><th>" + t("thItem") + "</th><th>" + t("thTotal") + "</th><th>" + t("thStatus") + "</th></tr></thead><tbody>" +
            orders.map(function (o) {
                return "<tr><td><b>" + o.number + "</b><br><small>" + fmt.format(new Date(o.date)) + "</small></td><td>" + o.items.join("<br>") + "</td><td>" + money(o.total) + '</td><td><span class="pill pill--ok">' + t("paid") + "</span><br><small>" + t("invoice") + " PDF</small></td></tr>";
            }).join("") +
            "</tbody></table></div>";
    }

    /* ---------------- boot ---------------- */

    setVideo();
    saveCart();
    applyLang();
    setMode(mode);
    setDir(dir);
})();

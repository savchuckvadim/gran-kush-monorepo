(function () {
    "use strict";

    var root = document.documentElement;
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) {
            try {
                if (v === null || v === undefined) localStorage.removeItem(k);
                else localStorage.setItem(k, v);
            } catch (e) {}
        },
    };

    /* ---------------- themes ---------------- */

    var THEMES = [
        { id: "clasico", modes: ["light", "dark"], tags: ["calm"], current: true,
          name: { es: "Clásico", ru: "Классика" },
          desc: { es: "El tema actual de la CRM: blanco, verde lima, sin efectos. Se queda tal cual.", ru: "Текущая тема CRM: белая, лаймовый акцент, без эффектов. Остаётся как есть." } },
        { id: "pafpaf", modes: ["light", "dark"], tags: ["motion"],
          name: { es: "PafPaf", ru: "PafPaf" },
          desc: { es: "Minimalismo blanco con esquinas grandes. Bordes con gradiente que fluye en lo importante.", ru: "Белый минимализм с крупными скруглениями. На главном — рамки с перетекающим градиентом." } },
        { id: "nagual", modes: ["dark", "light"], tags: ["bg", "events"],
          name: { es: "Nagual", ru: "Нагваль" },
          desc: { es: "Esmeralda y oro, serifas y geometría sagrada. Luciérnagas al registrar una entrada; respiración al cerrar caja.", ru: "Изумруд и золото, серифы, сакральная геометрия. Светлячки при входе, «дыхание» при закрытии кассы." } },
        { id: "unicornio", modes: ["light"], tags: ["glass", "motion", "events"],
          name: { es: "Unicornio", ru: "Единорог" },
          desc: { es: "Cristal arcoíris y pastel. Chispas tras el cursor y confeti cuando entra un socio.", ru: "Радужное стекло и пастель. Искры за курсором, конфетти, когда входит участник." } },
        { id: "galaxia", modes: ["dark", "light"], tags: ["bg", "motion"],
          name: { es: "Galaxia lejana", ru: "Далёкая галактика" },
          modeNames: { dark: { es: "Lado oscuro", ru: "Тёмная сторона" }, light: { es: "Lado luminoso", ru: "Светлая сторона" } },
          desc: { es: "Estrellas con paralaje y rótulos de HUD. Salto al hiperespacio al cambiar de sección.", ru: "Звёзды с параллаксом, подписи как на HUD. Прыжок в гиперпространство при смене раздела." } },
        { id: "asceta", modes: ["dark"], tags: ["oled", "calm"],
          name: { es: "Asceta", ru: "Аскет" },
          desc: { es: "Negro puro para pantallas OLED, un solo acento, botones grandes, cero animaciones. Se atenúa tras 20 s sin uso.", ru: "Чистый чёрный для OLED, один акцент, крупные кнопки, ноль анимаций. Гаснет через 20 с без действий." } },
        { id: "cristal", modes: ["light", "dark"], tags: ["glass", "bg"],
          name: { es: "Cristal", ru: "Кристалл" },
          desc: { es: "Paneles de cristal sobre la foto de tu club. Sube tu propio fondo.", ru: "Стеклянные панели поверх фото вашего клуба. Можно загрузить свой фон." } },
        { id: "vapor", modes: ["light"], tags: ["bg", "motion"],
          name: { es: "Vapor", ru: "Пар" },
          desc: { es: "Vapor holográfico: bordes iridiscentes, cifras con brillo y niebla de colores.", ru: "Голографический пар: переливающиеся рамки, цифры с отливом, цветной туман." } },
        { id: "brasa", modes: ["dark"], tags: ["bg", "motion"],
          name: { es: "Brasa", ru: "Угли" },
          desc: { es: "Lounge cálido: brasas que suben por el fondo y titulares estrechos.", ru: "Тёплый лаунж: угольки поднимаются по фону, узкие заголовки." } },
        { id: "trap", modes: ["dark"], tags: ["type"],
          name: { es: "Trap", ru: "Трэп" },
          desc: { es: "Calle: rosa y amarillo ácido, estados como pegatinas y tags de grafiti en los títulos.", ru: "Улица: розовый и кислотный жёлтый, статусы-стикеры, граффити-теги в заголовках." } },
        { id: "noventa", modes: ["light"], tags: ["type", "events"],
          name: { es: "90s", ru: "90-е" },
          desc: { es: "Papel de periódico y sombras duras. Contadores que pasan como en un casete y registro con código de tiempo VHS.", ru: "Газетная бумага и жёсткие тени. Счётчики листаются как в кассетнике, журнал с таймкодом VHS." } },
        { id: "grind", modes: ["dark"], tags: ["type", "events"],
          name: { es: "Grind", ru: "Грайнд" },
          desc: { es: "Negro y sangre. Un acceso denegado deja un sello rojo y sacude la ficha.", ru: "Чёрный и кровь. Отказ на входе ставит красный штамп и трясёт карточку." } },
        { id: "mediterraneo", modes: ["light", "dark"], tags: ["calm"],
          name: { es: "Mediterráneo", ru: "Средиземноморье" },
          modeNames: { light: { es: "Día", ru: "День" }, dark: { es: "Noche", ru: "Ночь" } },
          desc: { es: "Costa Blanca: cal, azul de mar, terracota y azulejos en el menú. Tranquilo, sin efectos.", ru: "Коста-Бланка: побелка, морской синий, терракота, азулежу в меню. Спокойно, без эффектов." } },
    ];

    function byId(id) {
        for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
        return null;
    }

    /* ---------------- dictionary ---------------- */

    var DICT = {
        es: {
            "nav.socios": "Socios", "nav.productos": "Productos", "nav.pedidos": "Pedidos", "nav.asistencia": "Asistencia",
            "nav.finanzas": "Finanzas", "nav.empleados": "Empleados", "nav.apariencia": "Apariencia", "nav.new": "nuevo", "nav.logout": "Salir",
            "top.theme": "Tema", "top.profile": "Mi perfil",
            "socios.title": "Socios", "socios.sub": "412 activos · 9 en revisión", "socios.search": "Buscar por nombre, Nº o documento", "socios.new": "Nuevo socio",
            "kpi.inside": "Dentro ahora", "kpi.inside.sub": "pico de hoy: 31", "kpi.active": "Socios activos", "kpi.active.sub": "<b>+12</b> este mes",
            "kpi.review": "En revisión", "kpi.review.sub": "esperan aval", "kpi.debt": "Cuotas vencidas", "kpi.debt.sub": "180 € por cobrar",
            "chip.all": "Todos", "chip.active": "Activos", "chip.review": "En revisión", "chip.debt": "Cuota vencida",
            "th.member": "Socio", "th.status": "Estado", "th.fee": "Cuota", "th.visit": "Última visita", "th.limit": "Límite del mes",
            "st.ok": "Activo", "st.review": "En revisión", "st.debt": "Cuota vencida", "st.off": "Baja",
            "fee.ok": "Al día", "fee.due": "Debe 30 €", "visit.today": "hoy {t}", "visit.yesterday": "ayer", "visit.days": "hace {n} días", "visit.months": "hace {n} meses",
            "scan.title": "Entrada", "scan.btn": "Escanear QR", "scan.hint": "El socio enseña su QR desde el móvil. Pulsa varias veces: hay entradas y un rechazo.",
            "scan.ok": "Entrada registrada · {t}", "scan.bad": "Acceso denegado: cuota vencida", "scan.stamp": "Denegado",
            "fact.fee.ok": "Cuota al día", "fact.fee.due": "Debe 30 €", "fact.sponsor": "Avalista Nº {n}", "fact.limit": "{u}/60 g este mes", "fact.age": "{a} años",
            "productos.title": "Productos", "productos.sub": "Stock al gramo y precio para socios.", "productos.new": "Nuevo producto",
            "prod.sativa": "Sativa", "prod.hybrid": "Híbrida", "prod.indica": "Índica", "prod.extract": "Extracto", "prod.cbd": "CBD",
            "prod.stock": "{g} g en stock", "prod.low": "Stock bajo", "prod.per": "/g",
            "pedidos.title": "Pedidos", "pedidos.sub": "Retiradas de hoy",
            "th.order": "Pedido", "th.items": "Producto", "th.grams": "Gramos", "th.total": "Total",
            "ord.done": "Entregado", "ord.prep": "Preparando", "ord.wait": "Pendiente", "ord.block": "Bloqueado",
            "asistencia.title": "Asistencia", "asistencia.sub": "Hoy, en directo",
            "kpi.entries": "Entradas hoy", "kpi.peak": "Hora pico", "kpi.avg": "Estancia media",
            "chart.title": "Entradas por hora", "log.title": "Registro", "log.in": "entrada", "log.out": "salida", "log.denied": "denegado",
            "finanzas.title": "Finanzas", "finanzas.sub": "Caja del turno de tarde", "fin.close": "Cerrar caja",
            "kpi.cash": "Caja de hoy", "kpi.fees": "Cuotas del mes", "kpi.pending": "Pendiente", "kpi.tickets": "Tickets",
            "mov.title": "Movimientos", "th.time": "Hora", "th.concept": "Concepto", "th.amount": "Importe",
            "mov.pickup": "Retirada", "mov.fee": "Cuota anual", "mov.stock": "Compra de stock", "mov.refund": "Devolución",
            "breath.in": "Inhala…", "breath.out": "Exhala…", "toast.closed": "Caja cerrada · {sum}",
            "empleados.title": "Equipo", "empleados.sub": "Roles y accesos",
            "role.admin": "Administración", "role.manager": "Encargado", "role.disp": "Dispensación", "staff.on": "En turno", "staff.off": "Libre",
            "ap.title": "Apariencia", "ap.sub": "Temas de autor para la CRM, el portal del socio y el formulario de alta.",
            "opt.scope": "Aplicar a", "opt.scope.hint": "El tema del club lo ven todos. Cada persona puede elegir el suyo.",
            "scope.me": "Solo para mí", "scope.club": "Todo el club",
            "opt.mode": "Modo", "opt.mode.one": "Este tema tiene un solo modo.", "opt.mode.two": "Elige claro u oscuro.",
            "mode.light": "Claro", "mode.dark": "Oscuro",
            "opt.eco": "Ahorro de energía", "opt.eco.hint": "Apaga animaciones, desenfoques y fondos. Para la tablet de la barra que está encendida 12 horas.",
            "opt.eco.forced": "Siempre activo en Asceta.",
            "opt.photo": "Foto de fondo", "opt.photo.hint": "Sube una foto de tu club. En el prototipo no se guarda.", "opt.photo.btn": "Subir foto",
            "opt.club": "Tema del club: {name}", "opt.club.hint": "Tú usas {name}.", "opt.club.reset": "Usar el del club",
            "form.title": "Formulario de alta", "form.hint": "El encargado elige el tema del formulario que rellenan los nuevos socios.", "form.same": "Como la CRM",
            "form.h": "Hazte socio", "form.p": "Club Nube Norte · Torrevieja. Necesitas el aval de un socio.",
            "form.name": "Nombre y apellidos", "form.doc": "DNI / NIE / pasaporte", "form.birth": "Fecha de nacimiento", "form.sponsor": "Nº de socio avalista",
            "form.ok": "Acepto las normas del club y la política de privacidad.", "form.btn": "Solicitar alta",
            "gal.title": "Temas", "tag.you": "Tuyo", "tag.club": "Del club", "tag.current": "Actual",
            "tag.calm": "Sin efectos", "tag.motion": "Animación", "tag.bg": "Fondo", "tag.events": "Efectos en eventos",
            "tag.glass": "Cristal", "tag.oled": "OLED", "tag.type": "Tipografía",
            "toast.theme": "Tema: {name}", "toast.club": "Tema del club: {name}", "dim.wake": "Toca para despertar",
        },
        ru: {
            "nav.socios": "Участники", "nav.productos": "Продукты", "nav.pedidos": "Заказы", "nav.asistencia": "Посещения",
            "nav.finanzas": "Финансы", "nav.empleados": "Сотрудники", "nav.apariencia": "Оформление", "nav.new": "новое", "nav.logout": "Выйти",
            "top.theme": "Тема", "top.profile": "Профиль",
            "socios.title": "Участники", "socios.sub": "412 активных · 9 на проверке", "socios.search": "Поиск по имени, № или документу", "socios.new": "Новый участник",
            "kpi.inside": "Сейчас в клубе", "kpi.inside.sub": "пик сегодня: 31", "kpi.active": "Активные участники", "kpi.active.sub": "<b>+12</b> за месяц",
            "kpi.review": "На проверке", "kpi.review.sub": "ждут поручителя", "kpi.debt": "Просроченные взносы", "kpi.debt.sub": "180 € к оплате",
            "chip.all": "Все", "chip.active": "Активные", "chip.review": "На проверке", "chip.debt": "Взнос просрочен",
            "th.member": "Участник", "th.status": "Статус", "th.fee": "Взнос", "th.visit": "Последний визит", "th.limit": "Лимит месяца",
            "st.ok": "Активен", "st.review": "На проверке", "st.debt": "Просрочен взнос", "st.off": "Выбыл",
            "fee.ok": "Оплачен", "fee.due": "Долг 30 €", "visit.today": "сегодня {t}", "visit.yesterday": "вчера", "visit.days": "{n} дн. назад", "visit.months": "{n} мес. назад",
            "scan.title": "Вход", "scan.btn": "Сканировать QR", "scan.hint": "Участник показывает QR с телефона. Нажмите несколько раз: будут входы и один отказ.",
            "scan.ok": "Вход отмечен · {t}", "scan.bad": "Вход запрещён: взнос просрочен", "scan.stamp": "Отказ",
            "fact.fee.ok": "Взнос оплачен", "fact.fee.due": "Долг 30 €", "fact.sponsor": "Поручитель № {n}", "fact.limit": "{u}/60 г в этом месяце", "fact.age": "{a} лет",
            "productos.title": "Продукты", "productos.sub": "Остаток в граммах и цена для участников.", "productos.new": "Новый продукт",
            "prod.sativa": "Сатива", "prod.hybrid": "Гибрид", "prod.indica": "Индика", "prod.extract": "Экстракт", "prod.cbd": "CBD",
            "prod.stock": "{g} г на складе", "prod.low": "Мало на складе", "prod.per": "/г",
            "pedidos.title": "Заказы", "pedidos.sub": "Выдачи за сегодня",
            "th.order": "Заказ", "th.items": "Продукт", "th.grams": "Граммы", "th.total": "Сумма",
            "ord.done": "Выдан", "ord.prep": "Готовится", "ord.wait": "Ожидает", "ord.block": "Заблокирован",
            "asistencia.title": "Посещения", "asistencia.sub": "Сегодня, в реальном времени",
            "kpi.entries": "Входов сегодня", "kpi.peak": "Час пик", "kpi.avg": "Среднее время",
            "chart.title": "Входы по часам", "log.title": "Журнал", "log.in": "вход", "log.out": "выход", "log.denied": "отказ",
            "finanzas.title": "Финансы", "finanzas.sub": "Касса вечерней смены", "fin.close": "Закрыть кассу",
            "kpi.cash": "Касса сегодня", "kpi.fees": "Взносы за месяц", "kpi.pending": "К получению", "kpi.tickets": "Чеки",
            "mov.title": "Движения", "th.time": "Время", "th.concept": "Операция", "th.amount": "Сумма",
            "mov.pickup": "Выдача", "mov.fee": "Годовой взнос", "mov.stock": "Закупка", "mov.refund": "Возврат",
            "breath.in": "Вдох…", "breath.out": "Выдох…", "toast.closed": "Касса закрыта · {sum}",
            "empleados.title": "Команда", "empleados.sub": "Роли и доступы",
            "role.admin": "Администратор", "role.manager": "Управляющий", "role.disp": "Выдача", "staff.on": "На смене", "staff.off": "Выходной",
            "ap.title": "Оформление", "ap.sub": "Авторские темы для CRM, кабинета участника и формы регистрации.",
            "opt.scope": "Применить к", "opt.scope.hint": "Тему клуба видят все. Каждый может выбрать свою.",
            "scope.me": "Только для меня", "scope.club": "Всему клубу",
            "opt.mode": "Режим", "opt.mode.one": "У этой темы один режим.", "opt.mode.two": "Светлый или тёмный.",
            "mode.light": "Светлый", "mode.dark": "Тёмный",
            "opt.eco": "Энергосбережение", "opt.eco.hint": "Отключает анимации, размытие и фоны. Для планшета на стойке, который работает по 12 часов.",
            "opt.eco.forced": "В теме «Аскет» включено всегда.",
            "opt.photo": "Фоновое фото", "opt.photo.hint": "Загрузите фото клуба. В прототипе не сохраняется.", "opt.photo.btn": "Загрузить фото",
            "opt.club": "Тема клуба: {name}", "opt.club.hint": "У вас своя: {name}.", "opt.club.reset": "Вернуть тему клуба",
            "form.title": "Форма регистрации", "form.hint": "Управляющий выбирает тему формы, которую заполняют новые участники.", "form.same": "Как в CRM",
            "form.h": "Стать участником", "form.p": "Club Nube Norte · Торревьеха. Нужен поручитель из участников клуба.",
            "form.name": "Имя и фамилия", "form.doc": "DNI / NIE / паспорт", "form.birth": "Дата рождения", "form.sponsor": "№ участника-поручителя",
            "form.ok": "Принимаю правила клуба и политику конфиденциальности.", "form.btn": "Отправить заявку",
            "gal.title": "Темы", "tag.you": "Ваша", "tag.club": "Клуба", "tag.current": "Текущая",
            "tag.calm": "Без эффектов", "tag.motion": "Анимация", "tag.bg": "Фон", "tag.events": "Эффекты на событиях",
            "tag.glass": "Стекло", "tag.oled": "OLED", "tag.type": "Типографика",
            "toast.theme": "Тема: {name}", "toast.club": "Тема клуба: {name}", "dim.wake": "Коснитесь, чтобы разбудить",
        },
    };

    var S = {
        club: store.get("crm.clubTheme") || "clasico",
        mine: store.get("crm.myTheme"),
        pref: (store.get("crm.mode") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark" ? "dark" : "light",
        eco: store.get("crm.eco") === "1",
        lang: store.get("crm.lang") === "ru" ? "ru" : "es",
        scope: store.get("crm.scope") === "club" ? "club" : "me",
        form: store.get("crm.formTheme") || "same",
    };
    if (!byId(S.club)) S.club = "clasico";
    if (S.mine && !byId(S.mine)) S.mine = null;

    function t(key, vars) {
        var s = (DICT[S.lang] && DICT[S.lang][key]) || DICT.es[key] || key;
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }

    function L(obj) {
        return obj[S.lang] || obj.es;
    }

    function money(v) {
        return new Intl.NumberFormat(S.lang === "ru" ? "ru-RU" : "es-ES", { style: "currency", currency: "EUR" }).format(v);
    }

    function initials(name) {
        return name.split(" ").map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }

    var ICONS = window.CRM_ICONS || {};
    function icon(name) {
        return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
    }
    function paintIcons(scope) {
        $$("svg[data-i]", scope).forEach(function (s) {
            s.setAttribute("viewBox", "0 0 24 24");
            s.setAttribute("aria-hidden", "true");
            s.innerHTML = ICONS[s.getAttribute("data-i")] || "";
            s.removeAttribute("data-i");
        });
    }

    /* ---------------- sample data ---------------- */

    var MEMBERS = [
        { n: "0147", name: "Lucía Martín", st: "ok", fee: "ok", visit: ["today", "18:42"], used: 41, sponsor: "0098", age: 31 },
        { n: "0151", name: "Andrei Volkov", st: "debt", fee: "due", visit: ["days", 12], used: 12, sponsor: "0033", age: 44 },
        { n: "0153", name: "Olena Kovalenko", st: "ok", fee: "ok", visit: ["today", "17:05"], used: 22, sponsor: "0147", age: 27 },
        { n: "0158", name: "Javier Ortega", st: "review", fee: "none", visit: ["never"], used: 0, sponsor: "0101", age: 22 },
        { n: "0162", name: "Marta Sánchez", st: "ok", fee: "ok", visit: ["yesterday"], used: 55, sponsor: "0101", age: 38 },
        { n: "0166", name: "Dmitri Sokolov", st: "ok", fee: "ok", visit: ["today", "16:20"], used: 8, sponsor: "0151", age: 35 },
        { n: "0170", name: "Emma Wilson", st: "off", fee: "none", visit: ["months", 2], used: 0, sponsor: "0012", age: 52 },
        { n: "0173", name: "Iryna Shevchenko", st: "ok", fee: "ok", visit: ["today", "15:48"], used: 30, sponsor: "0153", age: 29 },
    ];
    var PRODUCTS = [
        { name: "Amnesia Haze", type: "sativa", pct: "THC 21 %", g: 340, cap: 500, price: 7.5 },
        { name: "Gorilla Glue", type: "hybrid", pct: "THC 25 %", g: 120, cap: 400, price: 8 },
        { name: "Critical", type: "indica", pct: "THC 18 %", g: 510, cap: 600, price: 6.5 },
        { name: "Lemon Haze", type: "sativa", pct: "THC 19 %", g: 60, cap: 400, price: 7, low: true },
        { name: "Hash afgano", type: "extract", pct: "THC 30 %", g: 80, cap: 200, price: 9 },
        { name: "CBD Harlequin", type: "cbd", pct: "CBD 9 %", g: 200, cap: 300, price: 5.5 },
    ];
    var ORDERS = [
        { n: "#1029", m: "Javier Ortega", p: "—", g: 0, total: 0, st: "block" },
        { n: "#1028", m: "Olena Kovalenko", p: "Lemon Haze", g: 2, total: 14, st: "done" },
        { n: "#1027", m: "Marta Sánchez", p: "Gorilla Glue", g: 1, total: 8, st: "wait" },
        { n: "#1026", m: "Iryna Shevchenko", p: "CBD Harlequin", g: 2, total: 11, st: "prep" },
        { n: "#1025", m: "Dmitri Sokolov", p: "Critical", g: 3, total: 19.5, st: "done" },
        { n: "#1024", m: "Lucía Martín", p: "Amnesia Haze", g: 2, total: 15, st: "done" },
    ];
    var HOURS = [2, 4, 5, 6, 9, 7, 8, 11, 14, 12, 6, 3];
    var LOG = [
        { t: "18:30:51", f: "08", m: "Dmitri Sokolov", k: "out" },
        { t: "18:12:33", f: "21", m: "Iryna Shevchenko", k: "in" },
        { t: "17:58:02", f: "14", m: "Andrei Volkov", k: "denied" },
        { t: "17:05:44", f: "02", m: "Olena Kovalenko", k: "in" },
        { t: "16:20:19", f: "17", m: "Dmitri Sokolov", k: "in" },
        { t: "15:48:40", f: "11", m: "Iryna Shevchenko", k: "in" },
    ];
    var MOVES = [
        { t: "18:42", k: "pickup", m: "Lucía Martín", a: 15 },
        { t: "18:05", k: "fee", m: "Olena Kovalenko", a: 60 },
        { t: "17:40", k: "pickup", m: "Dmitri Sokolov", a: 19.5 },
        { t: "17:30", k: "stock", m: "—", a: -420 },
        { t: "16:55", k: "refund", m: "Marta Sánchez", a: -8 },
        { t: "16:20", k: "pickup", m: "Iryna Shevchenko", a: 11 },
    ];
    var STAFF = [
        { name: "Carmen López", role: "admin", on: true },
        { name: "Sergio Ruiz", role: "manager", on: true },
        { name: "Natalia Petrova", role: "disp", on: false },
        { name: "Tom Baker", role: "disp", on: true },
    ];
    var TILT = [-4, 3, -2, 5, -3, 2, -5, 4];

    function badge(kind, label, i) {
        return '<span class="badge badge--' + kind + '" style="--r:' + TILT[i % TILT.length] + 'deg">' + esc(label) + "</span>";
    }

    /* ---------------- renderers ---------------- */

    function visitText(v) {
        if (v[0] === "today") return t("visit.today", { t: v[1] });
        if (v[0] === "yesterday") return t("visit.yesterday");
        if (v[0] === "days") return t("visit.days", { n: v[1] });
        if (v[0] === "months") return t("visit.months", { n: v[1] });
        return "—";
    }

    function renderMembers() {
        var kind = { ok: "ok", review: "warn", debt: "bad", off: "off" };
        $("#members").innerHTML = MEMBERS.map(function (m, i) {
            var fee = m.fee === "ok" ? t("fee.ok") : m.fee === "due" ? '<span class="due">' + t("fee.due") + "</span>" : "—";
            var lim = m.st === "ok" || m.st === "debt"
                ? '<div class="lim"><div class="bar' + (m.used >= 50 ? " bar--warn" : "") + '"><i style="width:' + Math.round((m.used / 60) * 100) + '%"></i></div>' + m.used + "/60 g</div>"
                : '<span class="muted">—</span>';
            return "<tr>" +
                '<td><div class="who"><span class="av">' + initials(m.name) + "</span><div><b>" + esc(m.name) + "</b><small>Nº " + m.n + "</small></div></div></td>" +
                "<td>" + badge(kind[m.st], t("st." + m.st), i) + "</td>" +
                "<td>" + fee + "</td>" +
                '<td class="muted">' + visitText(m.visit) + "</td>" +
                "<td>" + lim + "</td></tr>";
        }).join("");
    }

    function renderProducts() {
        var pairs = [["--chart-1", "--chart-3"], ["--chart-4", "--chart-1"], ["--chart-2", "--chart-5"], ["--chart-3", "--chart-4"], ["--chart-5", "--chart-2"], ["--chart-1", "--chart-4"]];
        $("#prods").innerHTML = PRODUCTS.map(function (p, i) {
            var pr = pairs[i % pairs.length];
            return '<article class="card prod">' +
                '<div class="prod__top"><div class="prod__sw" style="--c1:var(' + pr[0] + ");--c2:var(" + pr[1] + ')"></div>' +
                (p.low ? badge("warn", t("prod.low"), i) : badge("off", t("prod." + p.type), i)) + "</div>" +
                "<h3>" + esc(p.name) + "</h3>" +
                '<div class="prod__meta"><span>' + esc(p.pct) + "</span><span>" + t("prod.stock", { g: p.g }) + "</span></div>" +
                '<div class="bar' + (p.low ? " bar--warn" : "") + '"><i style="width:' + Math.round((p.g / p.cap) * 100) + '%"></i></div>' +
                '<div class="price">' + money(p.price) + '<span class="muted" style="font-size:.8rem;font-weight:400"> ' + t("prod.per") + "</span></div>" +
                "</article>";
        }).join("");
    }

    function renderOrders() {
        var kind = { done: "ok", prep: "warn", wait: "off", block: "bad" };
        $("#orders").innerHTML = ORDERS.map(function (o, i) {
            return '<tr><td class="num">' + o.n + "</td>" +
                '<td><div class="who"><span class="av">' + initials(o.m) + "</span><b>" + esc(o.m) + "</b></div></td>" +
                "<td>" + esc(o.p) + "</td>" +
                '<td class="num right">' + (o.g ? o.g + " g" : "—") + "</td>" +
                '<td class="num right">' + (o.total ? money(o.total) : "—") + "</td>" +
                "<td>" + badge(kind[o.st], t("ord." + o.st), i) + "</td></tr>";
        }).join("");
    }

    function renderChart() {
        var max = Math.max.apply(null, HOURS);
        $("#chart").innerHTML = HOURS.map(function (v, i) {
            return '<div class="chart__col"><div class="chart__bar' + (v === max ? " is-peak" : "") + '" style="height:' + Math.round((v / max) * 100) + '%" title="' + v + '"></div><span class="chart__x">' + (12 + i) + "</span></div>";
        }).join("");
    }

    function renderLog() {
        var kind = { in: "ok", out: "off", denied: "bad" };
        $("#log").innerHTML = LOG.slice(0, 7).map(function (e, i) {
            return '<li><span class="tc"><span class="tc--std">' + e.t.slice(0, 5) + '</span><span class="tc--vhs">▶ ' + e.t + ":" + e.f + "</span></span>" +
                '<div class="who"><span class="av">' + initials(e.m) + "</span><b>" + esc(e.m) + "</b></div>" +
                badge(kind[e.k], t("log." + e.k), i) + "</li>";
        }).join("");
    }

    function renderMoves() {
        $("#moves").innerHTML = MOVES.map(function (m) {
            return '<tr><td class="num">' + m.t + "</td><td>" + t("mov." + m.k) + "</td>" +
                "<td>" + esc(m.m) + "</td>" +
                '<td class="right amount ' + (m.a >= 0 ? "amount--in" : "amount--out") + '">' + (m.a >= 0 ? "+" : "−") + money(Math.abs(m.a)) + "</td></tr>";
        }).join("");
        $$("[data-money]").forEach(function (el) { el.textContent = money(+el.getAttribute("data-money")); });
    }

    function renderStaff() {
        $("#staff").innerHTML = STAFF.map(function (s, i) {
            return '<div class="card"><span class="av">' + initials(s.name) + "</span><div style=\"display:grid;gap:4px\"><b>" + esc(s.name) + "</b>" +
                '<span class="muted" style="font-size:.85rem">' + t("role." + s.role) + "</span>" +
                "<span>" + badge(s.on ? "ok" : "off", t(s.on ? "staff.on" : "staff.off"), i) + "</span></div></div>";
        }).join("");
    }

    /* ---------------- theme state ---------------- */

    function themeId() {
        return S.mine && byId(S.mine) ? S.mine : S.club;
    }

    function effMode(th) {
        return th.modes.indexOf(S.pref) >= 0 ? S.pref : th.modes[0];
    }

    function modeName(th, mode) {
        return th.modeNames && th.modeNames[mode] ? L(th.modeNames[mode]) : t("mode." + mode);
    }

    function renderGallery() {
        var cur = themeId();
        var html = THEMES.map(function (th) {
            var mode = effMode(th);
            var tags = "";
            if (S.mine === th.id) tags += '<span class="tag tag--you">' + t("tag.you") + "</span>";
            if (S.club === th.id) tags += '<span class="tag tag--club">' + t("tag.club") + "</span>";
            if (th.current) tags += '<span class="tag">' + t("tag.current") + "</span>";
            return '<button type="button" class="th' + (th.id === cur ? " is-on" : "") + '" data-pick="' + th.id + '" aria-pressed="' + (th.id === cur) + '">' +
                '<span class="pv' + (mode === "dark" ? " dark" : "") + '" data-skin="' + th.id + '" aria-hidden="true">' +
                '<span class="pv__side"><i></i><i></i><i></i><i></i><i></i></span>' +
                '<span class="pv__main"><span class="pv__card"><span class="pv__aa">Aa</span><span class="pv__btn"></span></span>' +
                '<span class="pv__dots"><i style="background:var(--chart-1)"></i><i style="background:var(--chart-2)"></i><i style="background:var(--chart-3)"></i><i style="background:var(--chart-4)"></i></span></span></span>' +
                '<span><span class="th__name">' + esc(L(th.name)) + tags + "</span>" +
                '<span class="th__desc">' + esc(L(th.desc)) + "</span>" +
                '<span class="th__tags">' + th.tags.map(function (g) { return '<span class="tag">' + t("tag." + g) + "</span>"; }).join("") +
                (th.modes.length > 1 ? '<span class="tag">' + modeName(th, "light") + " / " + modeName(th, "dark") + "</span>" : "") +
                "</span></span></button>";
        }).join("");
        $$("[data-gallery]").forEach(function (g) { g.innerHTML = html; });
    }

    function renderOpts() {
        var th = byId(themeId());
        var mode = effMode(th);
        var ecoForced = th.id === "asceta";
        var html =
            '<div class="opt"><div><b>' + t("opt.scope") + "</b><small>" + t("opt.scope.hint") + "</small></div>" +
            '<div class="seg"><button type="button" data-scope="me" aria-pressed="' + (S.scope === "me") + '">' + t("scope.me") + "</button>" +
            '<button type="button" data-scope="club" aria-pressed="' + (S.scope === "club") + '">' + t("scope.club") + "</button></div></div>" +
            '<div class="opt"><div><b>' + t("opt.mode") + "</b><small>" + (th.modes.length > 1 ? t("opt.mode.two") : t("opt.mode.one")) + "</small></div>" +
            '<div class="seg">' + ["light", "dark"].map(function (m) {
                var ok = th.modes.indexOf(m) >= 0;
                return '<button type="button" data-setmode="' + m + '" aria-pressed="' + (mode === m) + '"' + (ok ? "" : " disabled") + ">" + modeName(th, m) + "</button>";
            }).join("") + "</div></div>" +
            '<div class="opt"><div><b>' + t("opt.eco") + "</b><small>" + (ecoForced ? t("opt.eco.forced") : t("opt.eco.hint")) + "</small></div>" +
            '<button type="button" class="switch" role="switch" data-eco aria-label="' + t("opt.eco") + '" aria-checked="' + (S.eco || ecoForced) + '"' + (ecoForced ? " disabled" : "") + "></button></div>";
        if (th.id === "cristal") {
            html += '<div class="opt"><div><b>' + t("opt.photo") + "</b><small>" + t("opt.photo.hint") + "</small></div>" +
                '<label class="btn btn--outline">' + icon("upload") + "<span>" + t("opt.photo.btn") + '</span><input type="file" accept="image/*" data-photo hidden /></label></div>';
        }
        if (S.mine && S.mine !== S.club) {
            html += '<div class="opt"><div><b>' + t("opt.club", { name: L(byId(S.club).name) }) + "</b><small>" + t("opt.club.hint", { name: L(th.name) }) + "</small></div>" +
                '<button type="button" class="btn btn--ghost" data-reset>' + t("opt.club.reset") + "</button></div>";
        }
        $$("[data-opts]").forEach(function (o) { o.innerHTML = html; });
    }

    function renderFormSelect() {
        var sel = $("#formTheme");
        sel.innerHTML = '<option value="same">' + t("form.same") + "</option>" + THEMES.map(function (th) {
            return '<option value="' + th.id + '">' + esc(L(th.name)) + "</option>";
        }).join("");
        sel.value = S.form;
    }

    function renderFormPreview() {
        var id = S.form === "same" ? themeId() : S.form;
        var th = byId(id) || byId("clasico");
        var f = $("#formPreview");
        f.setAttribute("data-skin", th.id);
        f.classList.toggle("dark", effMode(th) === "dark");
    }

    function apply() {
        var th = byId(themeId());
        var mode = effMode(th);
        var ecoOn = S.eco || th.id === "asceta";
        root.setAttribute("data-skin", th.id);
        root.classList.toggle("dark", mode === "dark");
        root.classList.toggle("eco", ecoOn);
        var mb = $("#modeBtn");
        mb.disabled = th.modes.length < 2;
        mb.title = th.modes.length < 2 ? t("opt.mode.one") : modeName(th, mode === "dark" ? "light" : "dark");
        $("#iconSun").style.display = mode === "dark" ? "" : "none";
        $("#iconMoon").style.display = mode === "dark" ? "none" : "";
        stars.active(th.id === "galaxia" && !ecoOn);
        idle.active(th.id === "asceta");
        sparkle.on = th.id === "unicornio" && !ecoOn && !reduced;
        renderGallery();
        renderOpts();
        renderFormPreview();
    }

    function pick(id) {
        var th = byId(id);
        if (!th) return;
        if (S.scope === "club") {
            S.club = id;
            S.mine = null;
            store.set("crm.clubTheme", id);
            store.set("crm.myTheme", null);
            toast(t("toast.club", { name: L(th.name) }));
        } else {
            S.mine = id;
            store.set("crm.myTheme", id);
            toast(t("toast.theme", { name: L(th.name) }));
        }
        apply();
    }

    /* ---------------- i18n ---------------- */

    function applyLang() {
        root.lang = S.lang;
        $$("[data-t]").forEach(function (el) { el.textContent = t(el.getAttribute("data-t")); });
        $$("[data-th]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-th")); });
        $$("[data-tp]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-tp"))); });
        $$("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === S.lang)); });
        renderMembers();
        renderProducts();
        renderOrders();
        renderChart();
        renderLog();
        renderMoves();
        renderStaff();
        renderFormSelect();
        if (lastScan !== null) renderScan(lastScan.m, lastScan.ok, lastScan.time);
    }

    /* ---------------- views ---------------- */

    var VIEWS = ["socios", "productos", "pedidos", "asistencia", "finanzas", "empleados", "apariencia"];

    function go(view, quiet) {
        if (VIEWS.indexOf(view) < 0) view = "socios";
        $$(".view").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== view; });
        $$(".nav-i").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-view") === view); });
        closeSide();
        if (!quiet) {
            window.scrollTo(0, 0);
            if (root.getAttribute("data-skin") === "galaxia") stars.warp();
            try { history.replaceState(null, "", "#" + view); } catch (e) {}
        }
    }

    /* ---------------- check-in ---------------- */

    var SEQ = [2, 1, 5, 7, 0, 1];
    var seqI = 0;
    var inside = 23;
    var entries = 87;
    var minute = 43;
    var lastScan = { m: MEMBERS[0], ok: true, time: "18:42" };

    function clock() {
        var h = 18 + Math.floor(minute / 60);
        return h + ":" + String(minute % 60).padStart(2, "0");
    }

    function renderScan(m, ok, time) {
        var facts = [
            m.fee === "due" ? t("fact.fee.due") : t("fact.fee.ok"),
            t("fact.sponsor", { n: m.sponsor }),
            t("fact.limit", { u: m.used }),
        ];
        $("#scanResult").innerHTML =
            '<div class="res' + (ok ? "" : " is-denied") + '">' +
            '<div class="who"><span class="av">' + initials(m.name) + "</span><div><b>" + esc(m.name) + "</b><small>Nº " + m.n + " · " + t("fact.age", { a: m.age }) + "</small></div></div>" +
            '<div class="res__facts">' + facts.map(function (f) { return '<span class="fact">' + esc(f) + "</span>"; }).join("") + "</div>" +
            (ok
                ? '<div class="alert alert--ok">' + icon("check") + "<span>" + t("scan.ok", { t: time }) + "</span></div>"
                : '<div class="alert alert--bad">' + icon("ban") + "<span>" + t("scan.bad") + "</span></div>") +
            '<div class="stamp">' + t("scan.stamp") + "</div></div>";
    }

    function scan() {
        var m = MEMBERS[SEQ[seqI++ % SEQ.length]];
        var ok = m.st === "ok";
        minute += 1 + (seqI % 3);
        var time = clock();
        $("#scanClock").textContent = time;
        lastScan = { m: m, ok: ok, time: time };
        renderScan(m, ok, time);
        LOG.unshift({ t: time + ":" + String(10 + seqI * 7 % 50), f: String(seqI * 13 % 25).padStart(2, "0"), m: m.name, k: ok ? "in" : "denied" });
        renderLog();
        if (ok) {
            inside += 1;
            entries += 1;
            setNum($("#kpiInside"), inside);
            setNum($("#kpiInside2"), inside);
            setNum($("#kpiEntries"), entries);
            celebrate($("#scanBtn"));
        }
    }

    /* ---------------- effects ---------------- */

    function fxOn() {
        return !reduced && !root.classList.contains("eco");
    }

    function setNum(el, v) {
        if (!el) return;
        if (root.getAttribute("data-skin") === "noventa" && fxOn()) {
            el.classList.remove("flip");
            void el.offsetWidth;
            el.classList.add("flip");
            setTimeout(function () { el.textContent = v; }, 180);
        } else {
            el.textContent = v;
        }
    }

    function spawn(cls, x, y, vars, life) {
        var el = document.createElement("i");
        el.className = cls;
        el.style.left = x + "px";
        el.style.top = y + "px";
        Object.keys(vars).forEach(function (k) { el.style.setProperty(k, vars[k]); });
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, life);
    }

    function celebrate(from) {
        if (!fxOn()) return;
        var th = root.getAttribute("data-skin");
        var r = from.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var i;
        if (th === "unicornio") {
            var colors = ["#ff7ac6", "#ffd36e", "#7ef0c1", "#5cc8ff", "#b04cff"];
            for (i = 0; i < 70; i++) {
                var a = -Math.PI * (0.1 + Math.random() * 0.8);
                var d = 90 + Math.random() * 220;
                spawn("confetti", cx, cy, {
                    "--c": colors[i % colors.length],
                    "--dx": Math.cos(a) * d + "px",
                    "--dy": Math.sin(a) * d + 140 + Math.random() * 120 + "px",
                    "--rot": (Math.random() * 720 - 360) + "deg",
                    "--t": (1.2 + Math.random() * 0.8) + "s",
                }, 2100);
            }
        } else if (th === "nagual") {
            for (i = 0; i < 16; i++) {
                spawn("firefly", r.left + Math.random() * r.width, r.top + Math.random() * r.height, {
                    "--dx": (Math.random() * 140 - 70) + "px",
                    "--dy": -(120 + Math.random() * 180) + "px",
                    "--t": (1.8 + Math.random() * 1.4) + "s",
                }, 3300);
            }
        }
    }

    var sparkle = { on: false, last: 0, colors: ["#ff7ac6", "#ffd36e", "#7ef0c1", "#5cc8ff", "#b04cff"] };
    window.addEventListener("pointermove", function (e) {
        if (!sparkle.on || e.pointerType === "touch") return;
        var now = performance.now();
        if (now - sparkle.last < 45) return;
        sparkle.last = now;
        spawn("sparkle", e.clientX + (Math.random() * 16 - 8), e.clientY + (Math.random() * 16 - 8), {
            "--c": sparkle.colors[Math.floor(Math.random() * sparkle.colors.length)],
        }, 820);
    }, { passive: true });

    function breathe(done) {
        if (root.getAttribute("data-skin") !== "nagual" || !fxOn()) return done();
        var el = document.createElement("div");
        el.className = "breath";
        el.innerHTML = '<div class="breath__orb"></div><div class="breath__txt">' + t("breath.in") + "</div>";
        document.body.appendChild(el);
        var txt = el.querySelector(".breath__txt");
        setTimeout(function () { txt.textContent = t("breath.out"); }, 2000);
        setTimeout(function () { el.remove(); done(); }, 4200);
    }

    var toastTimer = 0;
    function toast(msg) {
        var el = $("#toast");
        el.querySelector("span").textContent = msg;
        el.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
    }

    var idle = (function () {
        var on = false;
        var timer = 0;
        var dim = $("#dim");
        function reset() {
            if (!on) return;
            dim.hidden = true;
            clearTimeout(timer);
            timer = setTimeout(function () { dim.hidden = false; }, 20000);
        }
        ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) {
            window.addEventListener(ev, reset, { passive: true });
        });
        dim.addEventListener("click", reset);
        return {
            active: function (v) {
                on = v;
                if (!v) {
                    clearTimeout(timer);
                    dim.hidden = true;
                } else {
                    reset();
                }
            },
        };
    })();

    var stars = (function () {
        var cv = $("#stars");
        var ctx = cv.getContext("2d");
        var list = [];
        var w = 0;
        var h = 0;
        var raf = 0;
        var on = false;
        var px = 0;
        var py = 0;
        var warpUntil = 0;
        var color = "230 236 255";

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = cv.clientWidth || window.innerWidth;
            h = cv.clientHeight || window.innerHeight;
            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function star(z) {
            return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: z === undefined ? Math.random() : z, tw: Math.random() * 6.28 };
        }

        function seed() {
            list = [];
            for (var i = 0; i < 260; i++) list.push(star());
        }

        function project(s, z) {
            var k = 0.35 / z;
            return [w / 2 + s.x * k * w * 0.6 + px * (1 - z) * 40, h / 2 + s.y * k * h * 0.6 + py * (1 - z) * 40];
        }

        function draw(ts) {
            var warp = ts < warpUntil;
            var speed = warp ? 0.035 : 0.0007;
            ctx.clearRect(0, 0, w, h);
            for (var i = 0; i < list.length; i++) {
                var s = list[i];
                if (!reduced) s.z -= speed;
                if (s.z <= 0.04) {
                    list[i] = s = star(1);
                }
                var p = project(s, s.z);
                if (p[0] < -10 || p[0] > w + 10 || p[1] < -10 || p[1] > h + 10) {
                    list[i] = star(1);
                    continue;
                }
                var depth = 1 - s.z;
                var alpha = Math.min(1, depth * 1.3) * (0.65 + 0.35 * Math.sin(ts / 700 + s.tw));
                if (warp) {
                    var q = project(s, Math.min(1, s.z + 0.12));
                    ctx.strokeStyle = "rgb(" + color + " / " + Math.min(1, depth * 1.6) + ")";
                    ctx.lineWidth = 0.6 + depth * 1.8;
                    ctx.beginPath();
                    ctx.moveTo(q[0], q[1]);
                    ctx.lineTo(p[0], p[1]);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = "rgb(" + color + " / " + alpha + ")";
                    var r = 0.3 + depth * 1.5;
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], r, 0, 6.283);
                    ctx.fill();
                }
            }
        }

        function loop(ts) {
            draw(ts);
            raf = on && !reduced ? requestAnimationFrame(loop) : 0;
        }

        window.addEventListener("resize", function () { if (on) resize(); });
        window.addEventListener("pointermove", function (e) {
            px = (e.clientX / window.innerWidth - 0.5) * 2;
            py = (e.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });

        return {
            active: function (v) {
                color = getComputedStyle(root).getPropertyValue("--star").trim() || color;
                if (v === on) {
                    if (v && reduced) draw(0);
                    return;
                }
                on = v;
                if (v) {
                    resize();
                    if (!list.length) seed();
                    if (reduced) draw(0);
                    else if (!raf) raf = requestAnimationFrame(loop);
                } else if (raf) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                }
            },
            warp: function () {
                if (on && !reduced) warpUntil = performance.now() + 650;
            },
        };
    })();

    (function embers() {
        var box = $("#embers");
        var html = "";
        for (var i = 0; i < 18; i++) {
            html += '<span style="--x:' + Math.round(Math.random() * 100) + "%;--s:" + (2 + Math.random() * 3).toFixed(1) + "px;--t:" +
                (7 + Math.random() * 7).toFixed(1) + "s;--d:" + (-Math.random() * 14).toFixed(1) + "s;--sway:" + Math.round(Math.random() * 80 - 40) + 'px"></span>';
        }
        box.innerHTML = html;
    })();

    /* ---------------- wiring ---------------- */

    var side = $("#side");
    var scrim = $("#scrim");
    var drawer = $("#drawer");

    function closeSide() {
        side.classList.remove("is-open");
        $("#burger").setAttribute("aria-expanded", "false");
        if (!drawer.classList.contains("is-open")) scrim.classList.remove("is-on");
    }

    function openDrawer() {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        scrim.classList.add("is-on");
        var on = drawer.querySelector(".th.is-on");
        if (on) on.scrollIntoView({ block: "nearest" });
    }

    function closeDrawer() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        scrim.classList.remove("is-on");
    }

    $$(".nav-i").forEach(function (b) {
        b.addEventListener("click", function () { go(b.getAttribute("data-view")); });
    });

    $("#burger").addEventListener("click", function () {
        var open = !side.classList.contains("is-open");
        side.classList.toggle("is-open", open);
        scrim.classList.toggle("is-on", open);
        this.setAttribute("aria-expanded", String(open));
    });

    scrim.addEventListener("click", function () {
        closeDrawer();
        closeSide();
    });

    $("#openThemes").addEventListener("click", openDrawer);
    $("#closeThemes").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeDrawer();
            closeSide();
        }
    });

    $("#modeBtn").addEventListener("click", function () {
        var th = byId(themeId());
        S.pref = effMode(th) === "dark" ? "light" : "dark";
        store.set("crm.mode", S.pref);
        apply();
    });

    $$("[data-lang]").forEach(function (b) {
        b.addEventListener("click", function () {
            S.lang = b.getAttribute("data-lang");
            store.set("crm.lang", S.lang);
            applyLang();
            apply();
        });
    });

    document.addEventListener("click", function (e) {
        var el = e.target.closest("[data-pick],[data-scope],[data-setmode],[data-eco],[data-reset]");
        if (!el || el.disabled) return;
        if (el.hasAttribute("data-pick")) pick(el.getAttribute("data-pick"));
        else if (el.hasAttribute("data-scope")) {
            S.scope = el.getAttribute("data-scope");
            store.set("crm.scope", S.scope);
            renderOpts();
        } else if (el.hasAttribute("data-setmode")) {
            S.pref = el.getAttribute("data-setmode");
            store.set("crm.mode", S.pref);
            apply();
        } else if (el.hasAttribute("data-eco")) {
            S.eco = !S.eco;
            store.set("crm.eco", S.eco ? "1" : "0");
            apply();
        } else if (el.hasAttribute("data-reset")) {
            S.mine = null;
            store.set("crm.myTheme", null);
            toast(t("toast.club", { name: L(byId(S.club).name) }));
            apply();
        }
    });

    document.addEventListener("change", function (e) {
        if (e.target.matches("[data-photo]") && e.target.files && e.target.files[0]) {
            root.style.setProperty("--photo-user", 'url("' + URL.createObjectURL(e.target.files[0]) + '")');
        }
    });

    $("#formTheme").addEventListener("change", function () {
        S.form = this.value;
        store.set("crm.formTheme", S.form);
        renderFormPreview();
    });

    $("#scanBtn").addEventListener("click", scan);

    $("#closeCash").addEventListener("click", function () {
        breathe(function () { toast(t("toast.closed", { sum: money(1284.5) })); });
    });

    paintIcons(document);
    applyLang();
    apply();
    go((location.hash || "").slice(1), true);
})();

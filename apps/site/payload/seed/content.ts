import type { Locale } from "../../modules/shared/config/locales";
import type { Page, Plan } from "../../payload-types";

type L = Record<Locale, string>;
type Block = NonNullable<Page["layout"]>[number];

const pick = (text: L, locale: Locale) => text[locale];

const TRY: L = { es: "Probar gratis", ru: "Попробовать бесплатно", en: "Try it free" };

const FINAL = (locale: Locale): Block => ({
    id: "final-cta",
    blockType: "finalCta",
    title: pick(
        {
            es: "Tu club, fluido\nesta misma semana.",
            ru: "Ваш клуб без заминок —\nуже на этой неделе.",
            en: "Your club, flowing\nthis very week.",
        },
        locale,
    ),
    text: pick(
        { es: "Prueba gratis. Sin tarjeta.", ru: "Бесплатный пробный период. Без карты.", en: "Free trial. No card needed." },
        locale,
    ),
    cta: { label: pick(TRY, locale), href: "crm:register" },
});

const FEATURES: { id: string; icon: NonNullable<Extract<Block, { blockType: "featureGrid" }>["items"]>[number]["icon"]; title: L; text: L }[] = [
    {
        id: "f-signature",
        icon: "users",
        title: { es: "Firma electrónica", ru: "Электронная подпись", en: "Electronic signature" },
        text: {
            es: "Alta y consentimiento firmados en la pantalla, en tres minutos.",
            ru: "Анкета и согласие подписываются на экране за три минуты.",
            en: "Sign-up and consent signed on screen in three minutes.",
        },
    },
    {
        id: "f-passport",
        icon: "shield",
        title: { es: "Pasaporte único", ru: "Единый паспорт", en: "One passport" },
        text: {
            es: "El socio sube sus documentos una vez y decide qué club los ve.",
            ru: "Участник загружает документы один раз и сам решает, какой клуб их видит.",
            en: "Members upload their documents once and choose which club sees them.",
        },
    },
    {
        id: "f-entry",
        icon: "scan",
        title: { es: "Entrada por QR", ru: "Вход по QR", en: "QR entry" },
        text: {
            es: "Un escaneo y la visita queda anotada.",
            ru: "Один скан — и визит отмечен.",
            en: "One scan and the visit is recorded.",
        },
    },
    {
        id: "f-attendance",
        icon: "gauge",
        title: { es: "Asistencia", ru: "Посещаемость", en: "Attendance" },
        text: {
            es: "Quién está dentro, en directo; las visitas olvidadas se cierran solas.",
            ru: "Кто в клубе — в реальном времени; забытые визиты закрываются сами.",
            en: "Who is inside, live; forgotten visits close by themselves.",
        },
    },
    {
        id: "f-reports",
        icon: "layers",
        title: { es: "Informes", ru: "Отчётность", en: "Reports" },
        text: {
            es: "Socios, visitas y caja, por día y por mes.",
            ru: "Участники, визиты и касса — по дням и месяцам.",
            en: "Members, visits and cash, by day and by month.",
        },
    },
    {
        id: "f-member-zone",
        icon: "phone",
        title: { es: "Zona del socio", ru: "Кабинет участника", en: "Member zone" },
        text: {
            es: "Su QR y su historial, en el móvil.",
            ru: "QR и история — в телефоне.",
            en: "Their QR and history, on their phone.",
        },
    },
];

export const homeLayout = (locale: Locale): Block[] => [
    {
        id: "hero",
        blockType: "hero",
        eyebrow: pick({ es: "PafPaf · CRM para clubes", ru: "PafPaf · CRM для клубов", en: "PafPaf · CRM for clubs" }, locale),
        title: pick(
            { es: "Tu club, sin colas\nni papeles.", ru: "Клуб без очередей\nи бумаг.", en: "Your club, no queues,\nno paperwork." },
            locale,
        ),
        text: pick(
            {
                es: "Socios, firmas, entrada e informes en una sola pantalla.",
                ru: "Участники, подписи, вход и отчёты — на одном экране.",
                en: "Members, signatures, entry and reports on one screen.",
            },
            locale,
        ),
        primary: { label: pick(TRY, locale), href: "crm:register" },
        secondary: {
            label: pick({ es: "Ver cómo fluye", ru: "Как это работает", en: "See how it flows" }, locale),
            href: "#entrada",
        },
        hint: pick({ es: "Toca el humo", ru: "Коснитесь дыма", en: "Touch the smoke" }, locale),
        showLiveBar: true,
    },
    {
        id: "qr-door",
        blockType: "qrDoor",
        anchor: "entrada",
        eyebrow: pick({ es: "Entrada", ru: "Вход", en: "Entry" }, locale),
        title: pick({ es: "Un QR.\nUn segundo.", ru: "Один QR.\nОдна секунда.", en: "One QR.\nOne second." }, locale),
        text: pick(
            {
                es: "El socio enseña su QR y la CRM comprueba cuota, aval y estado antes de que guarde el móvil.",
                ru: "Участник показывает QR, и CRM проверяет взнос, поручителя и статус быстрее, чем он уберёт телефон.",
                en: "The member shows their QR and the CRM checks fee, sponsor and status before the phone is back in the pocket.",
            },
            locale,
        ),
    },
    {
        id: "features",
        blockType: "featureGrid",
        anchor: "funciones",
        eyebrow: pick({ es: "Funciones", ru: "Функции", en: "Features" }, locale),
        title: pick(
            { es: "Todo el club,\nen una pantalla.", ru: "Весь клуб —\nна одном экране.", en: "The whole club,\non one screen." },
            locale,
        ),
        items: FEATURES.map((feature) => ({
            id: feature.id,
            icon: feature.icon,
            title: pick(feature.title, locale),
            text: pick(feature.text, locale),
        })),
    },
    {
        id: "limit-flask",
        blockType: "limitFlask",
        eyebrow: pick({ es: "Plazas del plan", ru: "Места в тарифе", en: "Plan seats" }, locale),
        title: pick(
            { es: "Crece sin\ncambiar de CRM.", ru: "Растите,\nне меняя CRM.", en: "Grow without\nchanging CRM." },
            locale,
        ),
        text: pick(
            {
                es: "Mueve el control: suma socios nuevos y mira cuándo toca el plan siguiente. Tus datos se quedan donde están.",
                ru: "Подвиньте ползунок: добавьте новых участников и посмотрите, когда пора на следующий тариф. Данные остаются на месте.",
                en: "Move the slider: add new members and see when the next plan is due. Your data stays where it is.",
            },
            locale,
        ),
        used: 262,
        limit: 300,
        maxDraw: 60,
    },
    {
        id: "clubs",
        blockType: "clubsMerge",
        eyebrow: pick({ es: "Varios clubes", ru: "Несколько клубов", en: "Several clubs" }, locale),
        title: pick({ es: "Tres clubes.\nUna sola cuenta.", ru: "Три клуба.\nОдин аккаунт.", en: "Three clubs.\nOne account." }, locale),
        text: pick(
            {
                es: "Cada local con su equipo y sus socios. Tú lo ves todo desde el mismo sitio.",
                ru: "У каждого клуба своя команда и участники. А вы видите всё из одного места.",
                en: "Each venue with its own team and members. You see it all from one place.",
            },
            locale,
        ),
        clubs: [
            { id: "club-1", name: "Nube Norte" },
            { id: "club-2", name: "Brisa" },
            { id: "club-3", name: "Cala Mar" },
        ],
        merged: "PafPaf",
    },
    {
        id: "privacy",
        blockType: "privacyRoles",
        anchor: "privacidad",
        eyebrow: pick({ es: "Privacidad", ru: "Приватность", en: "Privacy" }, locale),
        title: pick(
            { es: "Cada rol ve\nsolo lo suyo.", ru: "Каждая роль\nвидит только своё.", en: "Each role sees\nonly its part." },
            locale,
        ),
        text: pick(
            {
                es: "Lo demás se queda tras el cristal. Los datos sensibles van cifrados y cada acceso queda registrado.",
                ru: "Остальное остаётся за матовым стеклом. Чувствительные данные зашифрованы, каждый доступ записан.",
                en: "Everything else stays behind the glass. Sensitive data is encrypted and every access is logged.",
            },
            locale,
        ),
    },
    {
        id: "pricing-teaser",
        blockType: "pricingTeaser",
        eyebrow: pick({ es: "Precios", ru: "Цены", en: "Pricing" }, locale),
        title: pick({ es: "Precios claros.", ru: "Понятные цены.", en: "Clear prices." }, locale),
        text: pick(
            { es: "Sin permanencia. Con el IVA a la vista.", ru: "Без обязательств. НДС виден сразу.", en: "No lock-in. VAT shown upfront." },
            locale,
        ),
        cta: { label: pick({ es: "Ver precios", ru: "Смотреть цены", en: "See pricing" }, locale), href: "/precios" },
    },
    FINAL(locale),
];

const ADDONS: { id: string; title: L; subtitle: L; price: L }[] = [
    {
        id: "a-migration",
        title: { es: "Migración desde Excel u otra CRM", ru: "Перенос из Excel или другой CRM", en: "Migration from Excel or another CRM" },
        subtitle: { es: "Gratis con Club y Cadena", ru: "Бесплатно в Club и Cadena", en: "Free with Club and Cadena" },
        price: { es: "149 €", ru: "149 €", en: "€149" },
    },
    {
        id: "a-onboarding",
        title: { es: "Puesta en marcha guiada", ru: "Запуск с сопровождением", en: "Guided onboarding" },
        subtitle: { es: "Una sesión con tu equipo", ru: "Одна сессия с вашей командой", en: "One session with your team" },
        price: { es: "59 €", ru: "59 €", en: "€59" },
    },
    {
        id: "a-cards",
        title: { es: "Tarjetas de socio con QR", ru: "Карты участников с QR", en: "Member cards with QR" },
        subtitle: { es: "50 unidades", ru: "50 штук", en: "50 cards" },
        price: { es: "39 €", ru: "39 €", en: "€39" },
    },
    {
        id: "a-domain",
        title: { es: "Dominio propio", ru: "Свой домен", en: "Your own domain" },
        subtitle: { es: "Tu club en tu dirección", ru: "Клуб на вашем адресе", en: "Your club at your address" },
        price: { es: "5 €/mes", ru: "5 €/мес", en: "€5/mo" },
    },
];

const FAQ: { id: string; question: L; answer: L }[] = [
    {
        id: "q-lockin",
        question: { es: "¿Hay permanencia?", ru: "Есть ли обязательства?", en: "Is there a lock-in?" },
        answer: {
            es: "No. Pagas mes a mes, o el año por adelantado con un 20 % menos.",
            ru: "Нет. Платите помесячно или за год вперёд со скидкой 20 %.",
            en: "No. Pay monthly, or a year ahead with 20% off.",
        },
    },
    {
        id: "q-payment",
        question: { es: "¿Cómo se paga?", ru: "Как оплатить?", en: "How do I pay?" },
        answer: {
            es: "Con tarjeta o SEPA a nombre de la asociación. Factura con su CIF.",
            ru: "Картой или SEPA на ассоциацию. Счёт выставляется на её CIF.",
            en: "By card or SEPA in the association's name. The invoice carries its CIF.",
        },
    },
    {
        id: "q-data",
        question: { es: "¿Qué pasa con mis datos si me voy?", ru: "Что будет с данными, если уйти?", en: "What happens to my data if I leave?" },
        answer: {
            es: "Los exportas cuando quieras, en CSV y PDF. Son tuyos.",
            ru: "Выгрузите их в любой момент в CSV и PDF. Они ваши.",
            en: "Export it whenever you want, as CSV and PDF. It is yours.",
        },
    },
    {
        id: "q-change",
        question: { es: "¿Puedo cambiar de plan?", ru: "Можно сменить тариф?", en: "Can I change plans?" },
        answer: {
            es: "En cualquier momento. El mes se prorratea.",
            ru: "В любой момент. Месяц пересчитывается пропорционально.",
            en: "Any time. The month is prorated.",
        },
    },
];

export const pricingLayout = (locale: Locale): Block[] => [
    {
        id: "pricing-table",
        blockType: "pricingTable",
        eyebrow: pick({ es: "Precios", ru: "Цены", en: "Pricing" }, locale),
        title: pick(
            { es: "Claros. Con el IVA\na la vista.", ru: "Понятные цены.\nНДС сразу виден.", en: "Clear. With VAT\nin plain sight." },
            locale,
        ),
        text: pick(
            {
                es: "Sin permanencia y sin coste de alta. Pruébalo gratis antes de pagar.",
                ru: "Без обязательств и платы за подключение. Сначала попробуйте бесплатно.",
                en: "No lock-in and no setup fee. Try it free before you pay.",
            },
            locale,
        ),
        defaultMembers: 400,
    },
    {
        id: "addons",
        blockType: "addons",
        eyebrow: pick({ es: "Extras", ru: "Дополнительно", en: "Extras" }, locale),
        title: pick({ es: "Lo que puedes sumar.", ru: "Что можно добавить.", en: "What you can add." }, locale),
        items: ADDONS.map((addon) => ({
            id: addon.id,
            title: pick(addon.title, locale),
            subtitle: pick(addon.subtitle, locale),
            price: pick(addon.price, locale),
        })),
    },
    {
        id: "faq",
        blockType: "faq",
        eyebrow: pick({ es: "Preguntas", ru: "Вопросы", en: "Questions" }, locale),
        title: pick({ es: "Sobre el pago.", ru: "Об оплате.", en: "About payment." }, locale),
        items: FAQ.map((item) => ({ id: item.id, question: pick(item.question, locale), answer: pick(item.answer, locale) })),
    },
    FINAL(locale),
];

export const PAGES: { slug: string; title: L; seoTitle: L; seoDescription: L; layout: (locale: Locale) => Block[] }[] = [
    {
        slug: "home",
        title: { es: "Inicio", ru: "Главная", en: "Home" },
        seoTitle: {
            es: "PafPaf — la CRM para clubes sociales y asociaciones",
            ru: "PafPaf — CRM для социальных клубов и ассоциаций",
            en: "PafPaf — the CRM for social clubs and associations",
        },
        seoDescription: {
            es: "Socios con firma electrónica, pasaporte único, entrada por QR, asistencia e informes. Hecho en Torrevieja.",
            ru: "Участники с электронной подписью, единый паспорт, вход по QR, посещаемость и отчётность. Сделано в Торревьехе.",
            en: "Members with electronic signature, one passport, QR entry, attendance and reports. Made in Torrevieja.",
        },
        layout: homeLayout,
    },
    {
        slug: "precios",
        title: { es: "Precios", ru: "Цены", en: "Pricing" },
        seoTitle: { es: "Precios — PafPaf", ru: "Цены — PafPaf", en: "Pricing — PafPaf" },
        seoDescription: {
            es: "Barrio, Club y Cadena: sin permanencia, con el IVA a la vista y migración incluida desde el plan Club.",
            ru: "Barrio, Club и Cadena: без обязательств, НДС виден сразу, перенос данных включён с тарифа Club.",
            en: "Barrio, Club and Cadena: no lock-in, VAT shown upfront and migration included from the Club plan.",
        },
        layout: pricingLayout,
    },
];

type PlanSeed = Omit<Plan, "id" | "createdAt" | "updatedAt" | "forWhom" | "features"> & {
    forWhom: L;
    features: { id: string; text: L }[];
};

export const PLANS: PlanSeed[] = [
    {
        code: "barrio",
        name: "Barrio",
        order: 1,
        forWhom: { es: "Para clubes que empiezan", ru: "Для клубов, которые только начинают", en: "For clubs that are starting out" },
        features: [
            { id: "barrio-1", text: { es: "Hasta 300 socios", ru: "До 300 участников", en: "Up to 300 members" } },
            {
                id: "barrio-2",
                text: { es: "CRM, zona del socio y entrada QR", ru: "CRM, кабинет участника и вход по QR", en: "CRM, member zone and QR entry" },
            },
            { id: "barrio-3", text: { es: "Pedidos y stock", ru: "Заказы и склад", en: "Orders and stock" } },
            { id: "barrio-4", text: { es: "Soporte por chat", ru: "Поддержка в чате", en: "Chat support" } },
        ],
        maxMembers: 300,
        highlight: false,
        billing: { monthlyCode: "barrio-month", yearlyCode: "barrio-year", fallbackMonthly: 25, fallbackYearly: 20 },
    },
    {
        code: "club",
        name: "Club",
        order: 2,
        forWhom: { es: "Para el club que va en serio", ru: "Для клуба, который работает всерьёз", en: "For the club that means business" },
        features: [
            { id: "club-1", text: { es: "Hasta 1.500 socios", ru: "До 1 500 участников", en: "Up to 1,500 members" } },
            { id: "club-2", text: { es: "Todo lo de Barrio", ru: "Всё из Barrio", en: "Everything in Barrio" } },
            { id: "club-3", text: { es: "Caja e informes", ru: "Касса и отчёты", en: "Cash and reports" } },
            { id: "club-4", text: { es: "Roles del equipo", ru: "Роли команды", en: "Team roles" } },
            { id: "club-5", text: { es: "Migración incluida", ru: "Перенос данных включён", en: "Migration included" } },
        ],
        maxMembers: 1500,
        highlight: true,
        billing: { monthlyCode: "club-month", yearlyCode: "club-year", fallbackMonthly: 49, fallbackYearly: 39 },
    },
    {
        code: "cadena",
        name: "Cadena",
        order: 3,
        forWhom: { es: "Para varios locales", ru: "Для нескольких клубов", en: "For several venues" },
        features: [
            { id: "cadena-1", text: { es: "Socios ilimitados", ru: "Без лимита участников", en: "Unlimited members" } },
            {
                id: "cadena-2",
                text: { es: "Varios clubes en una cuenta", ru: "Несколько клубов в одном аккаунте", en: "Several clubs in one account" },
            },
            { id: "cadena-3", text: { es: "Dominio y marca propios", ru: "Свой домен и бренд", en: "Own domain and brand" } },
            {
                id: "cadena-4",
                text: { es: "Soporte prioritario por WhatsApp", ru: "Приоритетная поддержка в WhatsApp", en: "Priority WhatsApp support" },
            },
        ],
        maxMembers: null,
        highlight: false,
        billing: { monthlyCode: "cadena-month", yearlyCode: "cadena-year", fallbackMonthly: 99, fallbackYearly: 79 },
    },
];

export const SITE_DOC = {
    code: "pafpaf" as const,
    name: "PafPaf",
    domain: "paf-paf.app",
    footerNote: {
        es: "Precios sin IVA; en España se añade el 21 %.",
        ru: "Цены без НДС; в Испании добавляется 21 %.",
        en: "Prices exclude VAT; 21% is added in Spain.",
    } satisfies L,
    legalNote: {
        es: "PafPaf: CRM por suscripción para clubes sociales, asociaciones y salones.",
        ru: "PafPaf — CRM по подписке для социальных клубов, ассоциаций и салонов.",
        en: "PafPaf: a subscription CRM for social clubs, associations and salons.",
    } satisfies L,
};

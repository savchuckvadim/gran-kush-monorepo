// Ink Space starter content: tattoo studios. Only what the CRM does today; booking, consent and
// reminders are announced as coming. The plans are placeholders until the studio prices are set
// (TASK-764, content-inkspace-plans.ts): while the beta lasts nothing is charged. Editors change all of it in the CMS.
import type { Locale } from "../../modules/shared/config/locales";

import { INKSPACE_PLANS } from "./content-inkspace-plans";
import {
    type Block,
    type FeatureIcon,
    type L,
    type PageSeed,
    pick,
    type SiteContent,
} from "./seed-types";

const TRY: L = { es: "Probar gratis", ru: "Попробовать бесплатно", en: "Try it free" };

const BETA: L = {
    es: "Gratis durante la beta. Sin tarjeta.",
    ru: "Бесплатно, пока идёт бета. Без карты.",
    en: "Free during the beta. No card needed.",
};

type Feature = { id: string; icon: FeatureIcon; title: L; text: L };

const FEATURES: Feature[] = [
    {
        id: "f-clients",
        icon: "users",
        title: { es: "Fichas de clientes", ru: "Карточки клиентов", en: "Client records" },
        text: {
            es: "Datos, notas e historial de cada cliente en un solo sitio.",
            ru: "Данные, заметки и история каждого клиента — в одном месте.",
            en: "Details, notes and history of every client in one place.",
        },
    },
    {
        id: "f-catalog",
        icon: "package",
        title: { es: "Catálogo y stock", ru: "Каталог и склад", en: "Catalog and stock" },
        text: {
            es: "Tintas, agujas y productos de cuidado, con el stock al día.",
            ru: "Краски, иглы и средства ухода — с актуальным остатком.",
            en: "Inks, needles and aftercare, with stock always up to date.",
        },
    },
    {
        id: "f-orders",
        icon: "layers",
        title: { es: "Pedidos", ru: "Заказы", en: "Orders" },
        text: {
            es: "Ventas y encargos por etapas, en un tablero.",
            ru: "Продажи и заказы по этапам — на одной доске.",
            en: "Sales and orders by stage, on one board.",
        },
    },
    {
        id: "f-team",
        icon: "shield",
        title: { es: "Equipo y permisos", ru: "Команда и права", en: "Team and permissions" },
        text: {
            es: "Cada artista ve lo que le toca; tú decides qué.",
            ru: "Каждый мастер видит своё — решаете вы.",
            en: "Each artist sees their part; you decide what.",
        },
    },
    {
        id: "f-finance",
        icon: "wallet",
        title: { es: "Caja e impuestos", ru: "Касса и налоги", en: "Cash and tax" },
        text: {
            es: "Ingresos, gastos e IVA, listos para tu gestoría.",
            ru: "Доходы, расходы и НДС — готово для бухгалтера.",
            en: "Income, expenses and VAT, ready for your accountant.",
        },
    },
    {
        id: "f-client-zone",
        icon: "phone",
        title: { es: "Zona del cliente", ru: "Кабинет клиента", en: "Client area" },
        text: {
            es: "Sus pedidos y sus datos, en el móvil.",
            ru: "Заказы и данные клиента — в его телефоне.",
            en: "Their orders and details, on their phone.",
        },
    },
];

const SOON: Feature[] = [
    {
        id: "s-booking",
        icon: "gauge",
        title: { es: "Agenda y reservas", ru: "Расписание и запись", en: "Calendar and booking" },
        text: {
            es: "El cliente elige artista y hueco; tú confirmas.",
            ru: "Клиент выбирает мастера и время, вы подтверждаете.",
            en: "Clients pick an artist and a slot; you confirm.",
        },
    },
    {
        id: "s-consent",
        icon: "scan",
        title: { es: "Consentimiento informado", ru: "Информированное согласие", en: "Informed consent" },
        text: {
            es: "Firmado en la pantalla antes de cada sesión.",
            ru: "Подписывается на экране перед каждым сеансом.",
            en: "Signed on screen before every session.",
        },
    },
    {
        id: "s-reminders",
        icon: "phone",
        title: { es: "Recordatorios", ru: "Напоминания", en: "Reminders" },
        text: {
            es: "Avisos de cita y de cuidados, sin escribir a mano.",
            ru: "Напоминания о сеансе и уходе — без ручных сообщений.",
            en: "Session and aftercare reminders, without typing them.",
        },
    },
];

const grid = (id: string, anchor: string, eyebrow: L, title: L, items: Feature[], locale: Locale): Block => ({
    id,
    blockType: "featureGrid",
    anchor,
    eyebrow: pick(eyebrow, locale),
    title: pick(title, locale),
    items: items.map((item) => ({ id: item.id, icon: item.icon, title: pick(item.title, locale), text: pick(item.text, locale) })),
});

const FINAL = (locale: Locale): Block => ({
    id: "final-cta",
    blockType: "finalCta",
    title: pick({ es: "Tu estudio, en orden\nesta misma semana.", ru: "Студия в порядке —\nуже на этой неделе.", en: "Your studio, in order\nthis very week." }, locale),
    text: pick(BETA, locale),
    cta: { label: pick(TRY, locale), href: "crm:register" },
});

const homeLayout = (locale: Locale): Block[] => [
    {
        id: "hero",
        blockType: "hero",
        eyebrow: pick({ es: "Ink Space · CRM para estudios de tatuaje", ru: "Ink Space · CRM для тату-студий", en: "Ink Space · CRM for tattoo studios" }, locale),
        title: pick({ es: "Tu estudio,\nen orden.", ru: "Ваша студия —\nв порядке.", en: "Your studio,\nin order." }, locale),
        text: pick(
            {
                es: "Clientes, pedidos, equipo y caja en una sola pantalla.",
                ru: "Клиенты, заказы, команда и касса — на одном экране.",
                en: "Clients, orders, team and cash on one screen.",
            },
            locale,
        ),
        primary: { label: pick(TRY, locale), href: "crm:register" },
        secondary: { label: pick({ es: "Ver funciones", ru: "Возможности", en: "See features" }, locale), href: "#funciones" },
        showLiveBar: false,
    },
    grid("features", "funciones", { es: "Funciones", ru: "Функции", en: "Features" }, { es: "Todo el estudio,\nen una pantalla.", ru: "Вся студия —\nна одном экране.", en: "The whole studio,\non one screen." }, FEATURES, locale),
    grid("soon", "pronto", { es: "Próximamente", ru: "Скоро", en: "Coming soon" }, { es: "Lo que viene.", ru: "Что дальше.", en: "What comes next." }, SOON, locale),
    {
        id: "pricing-teaser",
        blockType: "pricingTeaser",
        eyebrow: pick({ es: "Precios", ru: "Цены", en: "Pricing" }, locale),
        title: pick({ es: "Gratis durante la beta.", ru: "Бесплатно, пока идёт бета.", en: "Free during the beta." }, locale),
        text: pick({ es: "Estos serán los planes; hoy no pagas nada.", ru: "Такими будут тарифы; сейчас вы не платите ничего.", en: "These will be the plans; today you pay nothing." }, locale),
        cta: { label: pick({ es: "Ver precios", ru: "Смотреть цены", en: "See pricing" }, locale), href: "/precios" },
    },
    FINAL(locale),
];

const FAQ: { id: string; question: L; answer: L }[] = [
    {
        id: "q-beta",
        question: { es: "¿Cuánto cuesta durante la beta?", ru: "Сколько стоит бета?", en: "What does the beta cost?" },
        answer: {
            es: "Nada. Antes de empezar a cobrar te avisaremos.",
            ru: "Ничего. Перед тем как начать брать оплату, мы предупредим.",
            en: "Nothing. We will let you know before we start charging.",
        },
    },
    {
        id: "q-data",
        question: { es: "¿Qué pasa con mis datos si me voy?", ru: "Что будет с данными, если уйти?", en: "What happens to my data if I leave?" },
        answer: {
            es: "Los exportas cuando quieras. Son tuyos.",
            ru: "Выгрузите их в любой момент. Они ваши.",
            en: "Export them whenever you want. They are yours.",
        },
    },
    {
        id: "q-lockin",
        question: { es: "¿Hay permanencia?", ru: "Есть ли обязательства?", en: "Is there a lock-in?" },
        answer: { es: "No.", ru: "Нет.", en: "No." },
    },
];

const pricingLayout = (locale: Locale): Block[] => [
    {
        id: "plans",
        blockType: "pricingTeaser",
        eyebrow: pick({ es: "Precios", ru: "Цены", en: "Pricing" }, locale),
        title: pick({ es: "Gratis durante\nla beta.", ru: "Бесплатно,\nпока идёт бета.", en: "Free during\nthe beta." }, locale),
        text: pick(
            {
                es: "Precios orientativos, sin IVA: así serán los planes cuando acabe la beta.",
                ru: "Ориентировочные цены без НДС: такими тарифы станут после беты.",
                en: "Indicative prices, VAT excluded: the plans once the beta is over.",
            },
            locale,
        ),
    },
    {
        id: "faq",
        blockType: "faq",
        eyebrow: pick({ es: "Preguntas", ru: "Вопросы", en: "Questions" }, locale),
        title: pick({ es: "Sobre la beta.", ru: "О бете.", en: "About the beta." }, locale),
        items: FAQ.map((item) => ({ id: item.id, question: pick(item.question, locale), answer: pick(item.answer, locale) })),
    },
    FINAL(locale),
];

const PAGES: PageSeed[] = [
    {
        slug: "home",
        title: { es: "Inicio", ru: "Главная", en: "Home" },
        seoTitle: {
            es: "Ink Space — la CRM para estudios de tatuaje",
            ru: "Ink Space — CRM для тату-студий",
            en: "Ink Space — the CRM for tattoo studios",
        },
        seoDescription: {
            es: "Clientes, catálogo, pedidos, equipo y caja de tu estudio en una sola pantalla. Gratis durante la beta.",
            ru: "Клиенты, каталог, заказы, команда и касса студии — на одном экране. Бесплатно, пока идёт бета.",
            en: "Your studio's clients, catalog, orders, team and cash on one screen. Free during the beta.",
        },
        layout: homeLayout,
    },
    {
        slug: "precios",
        title: { es: "Precios", ru: "Цены", en: "Pricing" },
        seoTitle: { es: "Precios — Ink Space", ru: "Цены — Ink Space", en: "Pricing — Ink Space" },
        seoDescription: {
            es: "Solo, Estudio y Colectivo. Gratis durante la beta, sin permanencia.",
            ru: "Solo, Estudio и Colectivo. Бесплатно, пока идёт бета, без обязательств.",
            en: "Solo, Estudio and Colectivo. Free during the beta, no lock-in.",
        },
        layout: pricingLayout,
    },
];

export const INKSPACE_CONTENT: SiteContent = {
    PAGES,
    PLANS: INKSPACE_PLANS,
    SITE_DOC: {
        code: "inkspace",
        name: "Ink Space",
        domain: "ink.space",
        footerNote: {
            es: "Gratis durante la beta. Precios orientativos, sin IVA.",
            ru: "Бесплатно, пока идёт бета. Цены ориентировочные, без НДС.",
            en: "Free during the beta. Indicative prices, VAT excluded.",
        },
        legalNote: {
            es: "Ink Space: CRM por suscripción para estudios de tatuaje.",
            ru: "Ink Space — CRM по подписке для тату-студий.",
            en: "Ink Space: a subscription CRM for tattoo studios.",
        },
    },
};

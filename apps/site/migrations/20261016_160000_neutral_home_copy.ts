import type { MigrateUpArgs } from "@payloadcms/db-postgres";

import type { FeatureGridBlock, Page } from "../payload-types";

type Locale = "es" | "ru" | "en";
type L = Record<Locale, string>;
type Block = NonNullable<Page["layout"]>[number];

// The default locale first: required fields of new rows exist before the translations.
const LOCALES: Locale[] = ["es", "ru", "en"];

const SEO_DESCRIPTION: L = {
    es: "Socios con firma electrónica, pasaporte único, entrada por QR, asistencia e informes. Hecho en Torrevieja.",
    ru: "Участники с электронной подписью, единый паспорт, вход по QR, посещаемость и отчётность. Сделано в Торревьехе.",
    en: "Members with electronic signature, one passport, QR entry, attendance and reports. Made in Torrevieja.",
};

const HERO_TITLE: L = {
    es: "Tu club, sin colas\nni papeles.",
    ru: "Клуб без очередей\nи бумаг.",
    en: "Your club, no queues,\nno paperwork.",
};

const HERO_TEXT: L = {
    es: "Socios, firmas, entrada e informes en una sola pantalla.",
    ru: "Участники, подписи, вход и отчёты — на одном экране.",
    en: "Members, signatures, entry and reports on one screen.",
};

const QR_DOOR_TEXT: L = {
    es: "El socio enseña su QR y la CRM comprueba cuota, aval y estado antes de que guarde el móvil.",
    ru: "Участник показывает QR, и CRM проверяет взнос, поручителя и статус быстрее, чем он уберёт телефон.",
    en: "The member shows their QR and the CRM checks fee, sponsor and status before the phone is back in the pocket.",
};

type Icon = NonNullable<FeatureGridBlock["items"]>[number]["icon"];

const FEATURES: { id: string; icon: Icon; title: L; text: L }[] = [
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

const FLASK = {
    eyebrow: { es: "Plazas del plan", ru: "Места в тарифе", en: "Plan seats" } satisfies L,
    title: {
        es: "Crece sin\ncambiar de CRM.",
        ru: "Растите,\nне меняя CRM.",
        en: "Grow without\nchanging CRM.",
    } satisfies L,
    text: {
        es: "Mueve el control: suma socios nuevos y mira cuándo toca el plan siguiente. Tus datos se quedan donde están.",
        ru: "Подвиньте ползунок: добавьте новых участников и посмотрите, когда пора на следующий тариф. Данные остаются на месте.",
        en: "Move the slider: add new members and see when the next plan is due. Your data stays where it is.",
    } satisfies L,
    used: 262,
    limit: 300,
    maxDraw: 60,
};

/** Only the fields that talked about grams, pick-ups, a monthly limit or smoke; the rest of a block stays. */
const patch = (block: Block, locale: Locale): Block => {
    switch (block.blockType) {
        case "hero":
            return { ...block, title: HERO_TITLE[locale], text: HERO_TEXT[locale] };
        case "qrDoor":
            return { ...block, text: QR_DOOR_TEXT[locale] };
        case "featureGrid":
            return {
                ...block,
                items: FEATURES.map((feature) => ({
                    // the same scoped ids as the seed gives, so every locale writes the same rows
                    id: `pafpaf-home-${feature.id}`,
                    icon: feature.icon,
                    title: feature.title[locale],
                    text: feature.text[locale],
                })),
            };
        case "limitFlask":
            return {
                ...block,
                eyebrow: FLASK.eyebrow[locale],
                title: FLASK.title[locale],
                text: FLASK.text[locale],
                used: FLASK.used,
                limit: FLASK.limit,
                maxDraw: FLASK.maxDraw,
            };
        default:
            return block;
    }
};

/*
 * The home page talked about grams, pick-ups and a monthly limit, and its slogan about smoke: now it
 * reads as any members' club — electronic signature, one passport, QR entry, attendance, reports; the
 * flask shows the seats left in the plan. Production content was seeded once, so the seed change
 * alone never reaches it.
 *
 * Only those fields change, in every locale. Everything else is read back as it is in production and
 * written unchanged, so edits made in the Payload admin survive. `fallbackLocale: false` keeps an
 * untranslated field empty instead of saving another locale's text into it.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
    for (const locale of LOCALES) {
        const found = await payload.find({
            collection: "pages",
            where: { and: [{ site: { equals: "pafpaf" } }, { slug: { equals: "home" } }] },
            limit: 1,
            depth: 0,
            locale,
            fallbackLocale: false,
            req,
        });
        const page = found.docs[0];
        if (!page) return;

        await payload.update({
            collection: "pages",
            id: page.id,
            locale,
            data: {
                seo: { ...page.seo, description: SEO_DESCRIPTION[locale] },
                layout: (page.layout ?? []).map((block) => patch(block, locale)),
            },
            req,
        });
    }
}

// The old wording is not brought back.
export async function down(): Promise<void> {}

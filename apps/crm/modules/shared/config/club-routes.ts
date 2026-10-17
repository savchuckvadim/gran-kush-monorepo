/**
 * Адреса кабинета участника. Кабинет — часть приложения CRM, но открывается на своём домене
 * `club.paf-paf.app` (TASK-710…713): тот же контейнер, второй хост.
 *
 * Видимые адреса на club. короткие, без служебного префикса:
 *
 *   /{язык}                       дом: мои клубы и ожидающие подтверждения
 *   /{язык}/auth/…                вход, регистрация, сброс пароля, подтверждение почты
 *   /{язык}/join/{токен}          ссылка клуба (общая страница CRM)
 *   /{язык}/consent/{токен}       согласие по письму (общая страница CRM)
 *   /{язык}/me/…                  аккаунт: клубы, паспорт, настройки
 *   /{язык}/{клуб}/…              клуб: QR, присутствие, витрина
 *
 * Внутри приложения кабинет лежит в дереве `app/[locale]/m/…`, а `proxy.ts` на хосте club.
 * переписывает видимый адрес во внутренний (`rewrite`), не меняя адресной строки. На хосте CRM
 * дерево `m` закрыто (404): кабинет не должен открываться по адресу CRM.
 *
 * Здесь только чистые функции без Next, чтобы правила маршрутов читались и проверялись отдельно.
 */

/**
 * Слова, которые не могут быть slug клуба: они заняты страницами и служебными путями.
 * Зеркалит `RESERVED_PORTAL_SLUGS` в `apps/api/src/common/portal/reserved-slugs.ts`; тест API
 * (`reserved-slugs.spec.ts`) сверяет списки. Менять только вместе.
 */
export const RESERVED_CLUB_SLUGS = [
    "auth",
    "join",
    "consent",
    "me",
    "m",
    "home",
    "scan",
    "invite",
    "login",
    "register",
    "logout",
    "profile",
    "clubs",
    "about-us",
    "contacts",
    "account",
    "settings",
    "docs",
    "api",
    "admin",
    "crm",
    "club",
    "www",
    "app",
    "static",
    "public",
    "assets",
    "health",
    "ru",
    "en",
    "es",
] as const;

const RESERVED = new Set<string>(RESERVED_CLUB_SLUGS);

export const isReservedClubSlug = (slug: string): boolean => RESERVED.has(slug.toLowerCase());

/** Внутренний префикс дерева кабинета. */
export const CABINET_TREE = "m";

/**
 * Подсказки «есть сессия» от API (AUTH_ARCHITECTURE §3.4) на общем домене `AUTH_HINT_COOKIE_DOMAIN`.
 * Сами токены — HttpOnly-куки хоста API, фронту они не видны; подсказка лишь избавляет от
 * лишнего захода на защищённую страницу без входа. Мёртвую сессию всё равно отсекает API (401).
 */
export const SESSION_HINT_COOKIES = { crm: "crm_session", cabinet: "cabinet_session" } as const;

/**
 * Хост запроса. За Cloudflare и Traefik настоящий хост — в `x-forwarded-host` (первый из списка),
 * а `host` в standalone-сборке — внутренний `0.0.0.0:3000`.
 */
export const resolveRequestHost = (headers: { get(name: string): string | null }): string => {
    const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const raw = forwarded || headers.get("host") || "";
    return raw.split(":")[0]?.toLowerCase() ?? "";
};

/** `club.paf-paf.app`, `club.localhost` и любой другой хост, начинающийся с `club.`. */
export const isClubHost = (host: string): boolean => host === "club" || host.startsWith("club.");

/** Что сделать с запросом на хосте club. */
export type ClubRouteAction =
    /** Страница общая для CRM и кабинета (ссылка клуба, согласие): без изменений. */
    | { kind: "pass" }
    /** Показать внутреннюю страницу, адрес в строке не менять. */
    | { kind: "rewrite"; target: string }
    /** Старый адрес кабинета: постоянный редирект на новый. */
    | { kind: "redirect"; target: string };

/** Старые пути кабинета (`apps/web`) → новые. */
const LEGACY_CABINET: Record<string, string> = {
    profile: "",
    "profile/clubs": "/me/clubs",
    "profile/qr-code": "",
    "profile/presence": "",
    "profile/documents": "/me/passport",
    "profile/spending": "",
    "profile/settings": "/me",
    clubs: "/me/clubs",
    "about-us": "",
    contacts: "",
};

/**
 * Разбор пути на хосте club. `locale` уже проверен вызывающим; `rest` — сегменты после языка.
 * Первый сегмент решает, чем является страница:
 * служебные слова ведут в свои разделы, всё остальное — клуб по slug.
 */
export const resolveClubRoute = (locale: string, rest: string[]): ClubRouteAction => {
    const [first] = rest;
    const base = `/${locale}`;

    if (!first) {
        return { kind: "rewrite", target: `${base}/${CABINET_TREE}` };
    }
    if (first === "join" || first === "consent") {
        return { kind: "pass" };
    }

    const legacy = LEGACY_CABINET[rest.join("/")];
    if (legacy !== undefined) {
        return { kind: "redirect", target: `${base}${legacy}` };
    }
    if (first === "profile") {
        return { kind: "redirect", target: base };
    }

    // auth, me и клубы живут в дереве кабинета под теми же сегментами
    return { kind: "rewrite", target: `${base}/${CABINET_TREE}/${rest.join("/")}` };
};

/** Разделы кабинета, где без сессии делать нечего: `/{язык}/me/…` и `/{язык}/{клуб}/…`. */
export const isCabinetProtectedPath = (rest: string[]): boolean => {
    const [first] = rest;
    if (!first) return true;
    if (["auth", "join", "consent"].includes(first)) return false;
    return true;
};

/**
 * Slug клуба из видимого адреса кабинета: первый сегмент после языка, если это не служебное слово.
 * Ходит в заголовок `X-Portal-Slug` клиента API кабинета.
 */
export const getClubSlugFromPath = (pathname: string): string | null => {
    const segments = pathname.split("/").filter(Boolean);
    const slug = segments[1];
    if (!slug || isReservedClubSlug(slug)) {
        return null;
    }
    return slug.toLowerCase();
};

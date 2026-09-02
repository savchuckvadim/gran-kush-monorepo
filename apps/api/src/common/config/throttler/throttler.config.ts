import { ThrottlerModuleOptions } from "@nestjs/throttler";

/**
 * Именованные лимиты. Роут выбирает нужный через `@Throttle({ <name>: { ... } })`
 * либо остаётся на `default`.
 */
export const THROTTLE_NAMES = {
    DEFAULT: "default",
    AUTH: "auth",
    EMAIL: "email",
    PUBLIC_TOKEN: "public-token",
    SIGNUP: "signup",
    UPLOAD: "upload",
} as const;

const seconds = (n: number) => n * 1000;

const envLimit = (key: string, fallback: number): number => {
    const raw = process.env[key];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Лимиты запросов на IP.
 *
 * `default` — широкий потолок против скрейпа и случайного шторма от клиента;
 * остальные наборы жёстче и вешаются точечно на то, что стоит денег или
 * открывает доступ: подбор пароля, рассылка писем, перебор публичных токенов.
 *
 * Значения переопределяются переменными окружения — на нагрузочном стенде
 * лимиты поднимают, не трогая код.
 */
export const getThrottlerConfig = (): ThrottlerModuleOptions => ({
    throttlers: [
        {
            name: THROTTLE_NAMES.DEFAULT,
            ttl: seconds(60),
            limit: envLimit("THROTTLE_DEFAULT_LIMIT", 300),
        },
    ],
});

/** Подбор пароля и ротация токенов. */
export const AUTH_THROTTLE = {
    [THROTTLE_NAMES.DEFAULT]: {
        ttl: seconds(60),
        limit: envLimit("THROTTLE_AUTH_LIMIT", 20),
    },
};

/** Каждый запрос отправляет письмо: без лимита это рассылка с нашего SMTP. */
export const EMAIL_THROTTLE = {
    [THROTTLE_NAMES.DEFAULT]: {
        ttl: seconds(60),
        limit: envLimit("THROTTLE_EMAIL_LIMIT", 5),
    },
};

/** Перебор токенов приглашений и регистрационных ссылок. */
export const PUBLIC_TOKEN_THROTTLE = {
    [THROTTLE_NAMES.DEFAULT]: {
        ttl: seconds(60),
        limit: envLimit("THROTTLE_PUBLIC_TOKEN_LIMIT", 30),
    },
};

/** Массовое создание аккаунтов и порталов. */
export const SIGNUP_THROTTLE = {
    [THROTTLE_NAMES.DEFAULT]: {
        ttl: seconds(60),
        limit: envLimit("THROTTLE_SIGNUP_LIMIT", 10),
    },
};

/** Загрузка файлов: каждый запрос — мегабайты в памяти и объект в S3. */
export const UPLOAD_THROTTLE = {
    [THROTTLE_NAMES.DEFAULT]: {
        ttl: seconds(60),
        limit: envLimit("THROTTLE_UPLOAD_LIMIT", 20),
    },
};

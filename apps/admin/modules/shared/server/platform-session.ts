import { type NextRequest, NextResponse } from "next/server";

/**
 * Сессия платформенного админа живёт в HttpOnly-cookie админки, а не в браузерном хранилище:
 * `/platform/auth/login` отдаёт access и refresh в теле, поэтому админка ходит в API через свой
 * сервер (`app/api/platform/[...path]`), сама подставляет `Authorization` и обновляет пару при 401.
 */
export const PLATFORM_TOKEN_COOKIE = "platform_admin_token";
export const PLATFORM_REFRESH_COOKIE = "platform_admin_refresh";
export const PLATFORM_EMAIL_COOKIE = "platform_admin_email";

export interface PlatformTokens {
    accessToken: string;
    refreshToken: string;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const REFRESH_PATH = "/platform/auth/refresh";
const LOGOUT_PATH = "/platform/auth/logout";

/**
 * Окно, в котором параллельные запросы с одним refresh получают одну и ту же новую пару. API считает
 * повтор прежнего refresh в своём окне гонкой вкладок (401 `refresh_superseded`), а позже — кражей.
 */
const REFRESH_SHARE_MS = 30_000;

const FORWARDED_REQUEST_HEADERS = [
    "accept",
    "content-type",
    "idempotency-key",
    "user-agent",
] as const;
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const tokenExpiry = (token: string): Date | undefined => {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    try {
        const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
            exp?: unknown;
        };
        return typeof exp === "number" ? new Date(exp * 1000) : undefined;
    } catch {
        return undefined;
    }
};

// За прокси (nginx, Traefik) запрос приходит по http, исходный протокол — в X-Forwarded-Proto
const isHttps = (request: NextRequest): boolean =>
    request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";

/** Access живёт до своего `exp`; refresh и адрес — до `exp` refresh: по ним layout видит вход. */
export const setPlatformSession = (
    request: NextRequest,
    response: NextResponse,
    session: PlatformTokens & { email?: string | null }
): void => {
    const base = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isHttps(request),
        path: "/",
    };
    const sessionEnds = tokenExpiry(session.refreshToken);
    response.cookies.set(PLATFORM_TOKEN_COOKIE, session.accessToken, {
        ...base,
        expires: tokenExpiry(session.accessToken),
    });
    response.cookies.set(PLATFORM_REFRESH_COOKIE, session.refreshToken, {
        ...base,
        expires: sessionEnds,
    });
    const email = session.email ?? request.cookies.get(PLATFORM_EMAIL_COOKIE)?.value;
    if (email) {
        response.cookies.set(PLATFORM_EMAIL_COOKIE, email, { ...base, expires: sessionEnds });
    }
};

export const clearPlatformSession = (response: NextResponse): void => {
    response.cookies.delete(PLATFORM_TOKEN_COOKIE);
    response.cookies.delete(PLATFORM_REFRESH_COOKIE);
    response.cookies.delete(PLATFORM_EMAIL_COOKIE);
};

export const apiErrorResponse = (status: number, message: string): NextResponse =>
    NextResponse.json({ message, errors: [] }, { status });

const postWithRefreshToken = (path: string, refreshToken: string): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
    });

const requestRefresh = async (refreshToken: string): Promise<PlatformTokens | null> => {
    try {
        const upstream = await postWithRefreshToken(REFRESH_PATH, refreshToken);
        if (!upstream.ok) return null;
        const data = (await upstream.json()) as Partial<PlatformTokens>;
        return typeof data.accessToken === "string" && typeof data.refreshToken === "string"
            ? { accessToken: data.accessToken, refreshToken: data.refreshToken }
            : null;
    } catch {
        return null;
    }
};

const sharedRefreshes = new Map<string, Promise<PlatformTokens | null>>();

/** Новая пара по refresh из cookie; `null` — сессии больше нет. Одновременные запросы делят одну. */
export const refreshPlatformTokens = (request: NextRequest): Promise<PlatformTokens | null> => {
    const refreshToken = request.cookies.get(PLATFORM_REFRESH_COOKIE)?.value;
    if (!refreshToken) return Promise.resolve(null);
    const shared = sharedRefreshes.get(refreshToken);
    if (shared) return shared;
    const started = requestRefresh(refreshToken);
    sharedRefreshes.set(refreshToken, started);
    setTimeout(() => sharedRefreshes.delete(refreshToken), REFRESH_SHARE_MS);
    return started;
};

/** Выход: API гасит сессию; недоступный API выход не ломает — cookie всё равно стираются. */
export const endPlatformSession = async (request: NextRequest): Promise<void> => {
    const refreshToken = request.cookies.get(PLATFORM_REFRESH_COOKIE)?.value;
    if (!refreshToken) return;
    try {
        await postWithRefreshToken(LOGOUT_PATH, refreshToken);
    } catch {
        // сессия истечёт сама; cookie браузера стираются в любом случае
    }
};

/** Запрос к API от имени админа: access из cookie (или только что обновлённый) — в `Authorization`. */
export const fetchApi = async (
    request: NextRequest,
    apiPath: string,
    body?: string,
    accessToken?: string
): Promise<Response> => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
    const token = accessToken ?? request.cookies.get(PLATFORM_TOKEN_COOKIE)?.value;
    if (token) {
        headers.set("authorization", `Bearer ${token}`);
    }
    return fetch(`${API_BASE_URL}${apiPath}${request.nextUrl.search}`, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
    });
};

export const relayResponse = async (upstream: Response): Promise<NextResponse> => {
    const body = NULL_BODY_STATUSES.has(upstream.status) ? null : await upstream.arrayBuffer();
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    return new NextResponse(body, { status: upstream.status, headers });
};

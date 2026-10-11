import { type NextRequest, NextResponse } from "next/server";

/**
 * Сессия платформенного админа живёт в HttpOnly-cookie админки, а не в браузерном хранилище:
 * `/platform/auth/login` отдаёт только Bearer-токен, поэтому админка ходит в API через свой
 * сервер (`app/api/platform/[...path]`) и сама подставляет `Authorization`.
 */
export const PLATFORM_TOKEN_COOKIE = "platform_admin_token";
export const PLATFORM_EMAIL_COOKIE = "platform_admin_email";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "idempotency-key"] as const;
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

export const setPlatformSession = (
    request: NextRequest,
    response: NextResponse,
    session: { token: string; email: string | null }
): void => {
    const options = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isHttps(request),
        path: "/",
        expires: tokenExpiry(session.token),
    };
    response.cookies.set(PLATFORM_TOKEN_COOKIE, session.token, options);
    if (session.email) {
        response.cookies.set(PLATFORM_EMAIL_COOKIE, session.email, options);
    }
};

export const clearPlatformSession = (response: NextResponse): void => {
    response.cookies.delete(PLATFORM_TOKEN_COOKIE);
    response.cookies.delete(PLATFORM_EMAIL_COOKIE);
};

export const apiErrorResponse = (status: number, message: string): NextResponse =>
    NextResponse.json({ message, errors: [] }, { status });

/** Запрос к API от имени админа: токен из cookie уходит заголовком `Authorization`. */
export const fetchApi = async (
    request: NextRequest,
    apiPath: string,
    body?: string
): Promise<Response> => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
    const token = request.cookies.get(PLATFORM_TOKEN_COOKIE)?.value;
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

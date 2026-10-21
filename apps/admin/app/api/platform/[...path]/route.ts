import { type NextRequest, NextResponse } from "next/server";

import {
    apiErrorResponse,
    clearPlatformSession,
    fetchApi,
    refreshPlatformTokens,
    relayResponse,
    setPlatformSession,
} from "@/modules/shared/server/platform-session";

type RouteParams = { params: Promise<{ path: string[] }> };

const LOGIN_PATH = "/platform/auth/login";

type LoginResult = {
    accessToken?: unknown;
    refreshToken?: unknown;
    admin?: { email?: unknown };
};

const login = async (request: NextRequest, upstream: Response): Promise<NextResponse> => {
    if (!upstream.ok) {
        return relayResponse(upstream);
    }
    const data = (await upstream.json()) as LoginResult;
    if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        return apiErrorResponse(502, "Login response has no tokens");
    }
    // Токены остаются в HttpOnly-cookie, в браузер уходят только данные админа
    const response = NextResponse.json({ admin: data.admin ?? null }, { status: upstream.status });
    setPlatformSession(request, response, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        email: typeof data.admin?.email === "string" ? data.admin.email : null,
    });
    return response;
};

/** 401 от API: access истёк или отозван — одна попытка обновить пару и повторить запрос. */
const retryWithRefresh = async (
    request: NextRequest,
    apiPath: string,
    body: string | undefined,
    upstream: Response
): Promise<NextResponse> => {
    const tokens = await refreshPlatformTokens(request);
    if (!tokens) {
        const response = await relayResponse(upstream);
        clearPlatformSession(response);
        return response;
    }
    const retried = await fetchApi(request, apiPath, body, tokens.accessToken);
    const response = await relayResponse(retried);
    if (retried.status === 401) {
        clearPlatformSession(response);
    } else {
        setPlatformSession(request, response, tokens);
    }
    return response;
};

const proxy = async (request: NextRequest, { params }: RouteParams): Promise<NextResponse> => {
    const { path } = await params;
    // encodeURIComponent не трогает точки: «..» вывел бы запрос за пределы /platform
    if (path.some((segment) => segment === "." || segment === "..")) {
        return apiErrorResponse(400, "Invalid path");
    }
    const apiPath = `/platform/${path.map(encodeURIComponent).join("/")}`;
    const body = request.method === "GET" ? undefined : await request.text();

    try {
        const upstream = await fetchApi(request, apiPath, body);
        if (apiPath === LOGIN_PATH && request.method === "POST") {
            return await login(request, upstream);
        }
        if (upstream.status === 401) {
            return await retryWithRefresh(request, apiPath, body, upstream);
        }
        return await relayResponse(upstream);
    } catch {
        return apiErrorResponse(502, "API is unreachable");
    }
};

export { proxy as GET, proxy as PATCH, proxy as POST };

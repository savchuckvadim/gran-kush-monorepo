import { type NextRequest, NextResponse } from "next/server";

import {
    apiErrorResponse,
    clearPlatformSession,
    fetchApi,
    relayResponse,
    setPlatformSession,
} from "@/modules/shared/server/platform-session";

type RouteParams = { params: Promise<{ path: string[] }> };

const LOGIN_PATH = "/platform/auth/login";

type LoginResult = { accessToken?: unknown; admin?: { email?: unknown } };

const login = async (request: NextRequest, upstream: Response): Promise<NextResponse> => {
    if (!upstream.ok) {
        return relayResponse(upstream);
    }
    const data = (await upstream.json()) as LoginResult;
    if (typeof data.accessToken !== "string") {
        return apiErrorResponse(502, "Login response has no token");
    }
    // Токен остаётся в HttpOnly-cookie, в браузер уходят только данные админа
    const response = NextResponse.json({ admin: data.admin ?? null }, { status: upstream.status });
    setPlatformSession(request, response, {
        token: data.accessToken,
        email: typeof data.admin?.email === "string" ? data.admin.email : null,
    });
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

    let upstream: Response;
    try {
        upstream = await fetchApi(request, apiPath, body);
    } catch {
        return apiErrorResponse(502, "API is unreachable");
    }

    if (apiPath === LOGIN_PATH && request.method === "POST") {
        return login(request, upstream);
    }
    const response = await relayResponse(upstream);
    if (upstream.status === 401) {
        clearPlatformSession(response);
    }
    return response;
};

export { proxy as GET, proxy as PATCH, proxy as POST };

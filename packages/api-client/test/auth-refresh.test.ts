import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthMiddleware } from "../src/auth/api-auth.middleware";
import { ApiRefreshHelper } from "../src/auth/api-auth.refresh-helper";
import { ApiAuthType } from "../src/auth/api-auth.type";

const BASE = "https://api.test";

/** Ответ refresh приходит не сразу: так оба 401 успевают встретиться в одном окне. */
const later = <T>(value: T, ms = 20): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(value), ms));

const refreshCalls = (fetchMock: ReturnType<typeof vi.fn>, path: string): number =>
    fetchMock.mock.calls.filter(([input]) => String(input) === `${BASE}${path}`).length;

/**
 * Обновление токенов у двух клиентов одного приложения (TASK-710): CRM и кабинет живут вместе,
 * и одновременный 401 не должен ни слать лишние refresh, ни смешивать результаты клиентов.
 */
describe("token refresh of two clients", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let failing: Set<string>;
    /** refresh, который выиграла соседняя вкладка: 401 с кодом refresh_superseded */
    let superseded: Set<string>;

    beforeEach(() => {
        failing = new Set();
        superseded = new Set();
        fetchMock = vi.fn((input: RequestInfo | URL) => {
            const url = String(input instanceof Request ? input.url : input);
            const path = url.slice(BASE.length);
            if (path.endsWith("/auth/refresh") && superseded.has(path)) {
                return later(
                    new Response(JSON.stringify({ code: "refresh_superseded" }), {
                        status: 401,
                        headers: { "content-type": "application/json" },
                    })
                );
            }
            if (path.endsWith("/auth/refresh")) {
                return later(new Response(null, { status: failing.has(path) ? 401 : 201 }));
            }
            return later(
                new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
            );
        });
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("parallel 401s of one client share a single refresh", async () => {
        const first = new ApiRefreshHelper(ApiAuthType.CRM, BASE);
        const second = new ApiRefreshHelper(ApiAuthType.CRM, BASE);

        await Promise.all([first.makeToken(), second.makeToken(), first.makeToken()]);

        expect(refreshCalls(fetchMock, "/crm/auth/refresh")).toBe(1);
    });

    it("the CRM and the cabinet refresh each their own session at the same time", async () => {
        const crm = new ApiRefreshHelper(ApiAuthType.CRM, BASE);
        const cabinet = new ApiRefreshHelper(ApiAuthType.CABINET, BASE);

        await Promise.all([crm.makeToken(), cabinet.makeToken()]);

        expect(refreshCalls(fetchMock, "/crm/auth/refresh")).toBe(1);
        expect(refreshCalls(fetchMock, "/cabinet/auth/refresh")).toBe(1);
    });

    it("a failed refresh of one client does not fail the other", async () => {
        failing.add("/crm/auth/refresh");
        const crm = new ApiRefreshHelper(ApiAuthType.CRM, BASE);
        const cabinet = new ApiRefreshHelper(ApiAuthType.CABINET, BASE);

        const [crmResult, cabinetResult] = await Promise.allSettled([
            crm.makeToken(),
            cabinet.makeToken(),
        ]);

        expect(crmResult.status).toBe("rejected");
        expect(cabinetResult.status).toBe("fulfilled");
    });

    it("a refresh another tab already won counts as done for a cookie client", async () => {
        superseded.add("/crm/auth/refresh");
        const crm = new ApiRefreshHelper(ApiAuthType.CRM, BASE);

        await expect(crm.makeToken()).resolves.toBeUndefined();
    });

    it("an ended session is still a failed refresh", async () => {
        failing.add("/crm/auth/refresh");
        const crm = new ApiRefreshHelper(ApiAuthType.CRM, BASE);

        await expect(crm.makeToken()).rejects.toThrow();
    });

    it("after a refresh settles, the next 401 starts a new one", async () => {
        failing.add("/cabinet/auth/refresh");
        const cabinet = new ApiRefreshHelper(ApiAuthType.CABINET, BASE);
        await expect(cabinet.makeToken()).rejects.toThrow();

        failing.clear();
        await cabinet.makeToken();

        expect(refreshCalls(fetchMock, "/cabinet/auth/refresh")).toBe(2);
    });

    it("both clients retry their request after their own refresh", async () => {
        const middleware = (type: ApiAuthType) => getAuthMiddleware(type, BASE);
        const unauthorized = () => new Response(null, { status: 401 });
        const call = async (type: ApiAuthType, path: string) => {
            const request = new Request(`${BASE}${path}`);
            const auth = middleware(type);
            await auth.onRequest?.({ request } as never);
            return auth.onResponse?.({ request, response: unauthorized() } as never);
        };

        const [crm, cabinet] = await Promise.all([
            call(ApiAuthType.CRM, "/crm/members"),
            call(ApiAuthType.CABINET, "/cabinet/qr-code"),
        ]);

        expect((crm as Response).status).toBe(200);
        expect((cabinet as Response).status).toBe(200);
        expect(refreshCalls(fetchMock, "/crm/auth/refresh")).toBe(1);
        expect(refreshCalls(fetchMock, "/cabinet/auth/refresh")).toBe(1);
        const retried = fetchMock.mock.calls
            .map(([input]) => String(input instanceof Request ? input.url : input))
            .filter((url) => !url.endsWith("/auth/refresh"));
        expect(retried.sort()).toEqual([`${BASE}/cabinet/qr-code`, `${BASE}/crm/members`]);
    });
});

import type { INestApplication } from "@nestjs/common";

import { randomUUID } from "crypto";

import { SESSION_COOKIE_NAMES } from "../../src/modules/portal/auth/sessions/api/session-cookies.service";
import { SessionsService } from "../../src/modules/portal/auth/sessions/application/sessions.service";
import {
    SESSION_AUDIENCES,
    type SessionAudience,
} from "../../src/modules/portal/auth/sessions/domain/auth-session";

export interface TestSession {
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    /** Заголовок `Cookie` с access-кукой аудитории — как у браузера после входа. */
    cookies: string;
    /** Заголовок `Cookie` с refresh-кукой — для `/{aud}/auth/refresh` и `logout`. */
    refreshCookie: string;
}

/**
 * Сессия без формы входа — для тестов того, что за входом. Выдаётся тем же `SessionsService`, что
 * и в бою, поэтому гварды видят обычную строку `auth_sessions`.
 */
export const startTestSession = async (
    app: INestApplication,
    userId: string,
    audience: SessionAudience,
    deviceId: string = `device-${randomUUID()}`
): Promise<TestSession> => {
    const started = await app.get(SessionsService).start({
        userId,
        audience,
        method: "password",
        client: { deviceId },
    });
    const names = SESSION_COOKIE_NAMES[audience];
    return {
        ...started,
        cookies: `${names.access}=${started.accessToken}`,
        refreshCookie: `${names.refresh}=${started.refreshToken}`,
    };
};

export const cabinetSession = (
    app: INestApplication,
    userId: string,
    deviceId?: string
): Promise<TestSession> => startTestSession(app, userId, SESSION_AUDIENCES.Cabinet, deviceId);

export const crmSession = (
    app: INestApplication,
    userId: string,
    deviceId?: string
): Promise<TestSession> => startTestSession(app, userId, SESSION_AUDIENCES.Crm, deviceId);

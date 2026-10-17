import { Injectable, UnauthorizedException } from "@nestjs/common";

import type { Request, Response } from "express";

import { resolveDeviceIdFromHeaders } from "@common/auth";

import {
    SESSION_ERROR_CODES,
    SessionsService,
    type StartedSession,
} from "../application/sessions.service";
import type { SessionAudience, SessionClient, SignInMethod } from "../domain/auth-session";

import { SessionCookiesService } from "./session-cookies.service";

const USER_AGENT_MAX = 512;

/** Устройство, браузер и адрес запроса — для строки сессии и списка устройств. */
export const sessionClientOf = (request: Request): SessionClient => ({
    deviceId: resolveDeviceIdFromHeaders(request.headers),
    userAgent: request.headers["user-agent"]?.slice(0, USER_AGENT_MAX),
    ipAddress: request.ip,
});

/** Выданная сессия и устройство, на которое она записана: клиент сохраняет его для `X-Device-Id`. */
export type IssuedSession = StartedSession & { deviceId: string };

/**
 * Сессии для HTTP: вход и выход с куками (веб) или токенами в теле (мобильные). Контроллеры и
 * сценарии входа решают, кого впустить, а выдачу сессии отдают сюда — одна точка на все способы
 * входа (пароль, Google, Telegram, приглашение, регистрация).
 */
@Injectable()
export class SessionHttpService {
    constructor(
        private readonly sessions: SessionsService,
        private readonly cookies: SessionCookiesService
    ) {}

    /** Веб-вход: сессия и куки аудитории. */
    async signIn(
        request: Request,
        response: Response,
        input: { userId: string; audience: SessionAudience; method: SignInMethod }
    ): Promise<IssuedSession> {
        const issued = await this.issue(request, input);
        this.cookies.write(response, input.audience, issued);
        return issued;
    }

    /** Мобильный вход: токены уходят в теле ответа, кук нет. */
    async issue(
        request: Request,
        input: { userId: string; audience: SessionAudience; method: SignInMethod }
    ): Promise<IssuedSession> {
        const client = sessionClientOf(request);
        const started = await this.sessions.start({ ...input, client });
        return { ...started, deviceId: client.deviceId };
    }

    async refreshFromCookies(
        request: Request,
        response: Response,
        audience: SessionAudience
    ): Promise<void> {
        const refreshToken = this.cookies.readRefresh(request, audience);
        if (!refreshToken) {
            throw new UnauthorizedException("Refresh cookie is missing");
        }
        try {
            this.cookies.write(
                response,
                audience,
                await this.sessions.refresh(refreshToken, audience)
            );
        } catch (error) {
            // Конченая сессия — куки больше не нужны; при гонке вкладок их не трогаем
            if (error instanceof UnauthorizedException && !isSuperseded(error)) {
                this.cookies.clear(response, audience);
            }
            throw error;
        }
    }

    async signOutFromCookies(
        request: Request,
        response: Response,
        audience: SessionAudience
    ): Promise<void> {
        const refreshToken = this.cookies.readRefresh(request, audience);
        if (refreshToken) {
            await this.sessions.endByRefreshToken(refreshToken, audience);
        }
        this.cookies.clear(response, audience);
    }
}

const isSuperseded = (error: UnauthorizedException): boolean => {
    const body = error.getResponse();
    return (
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        body.code === SESSION_ERROR_CODES.refreshSuperseded
    );
};

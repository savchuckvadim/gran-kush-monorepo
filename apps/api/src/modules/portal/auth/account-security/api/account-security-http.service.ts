import { Injectable } from "@nestjs/common";

import type { Response } from "express";

import { toIdentityHttpError } from "@modules/portal/auth/identity/api/identity-http-error";
import { IdentityProviderRegistry } from "@modules/portal/auth/identity/application/identity-provider.registry";
import { LinkIdentityUseCase } from "@modules/portal/auth/identity/application/use-cases/link-identity.use-case";
import { SessionCookiesService } from "@modules/portal/auth/sessions/api/session-cookies.service";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { AccountSecurityService } from "../application/services/account-security.service";
import { ChangeAccountPasswordUseCase } from "../application/use-cases/change-account-password.use-case";
import { UnlinkProviderUseCase } from "../application/use-cases/unlink-provider.use-case";

import type { AccountSecurityDto, ChangeAccountPasswordDto } from "./dto/account-security.dto";

/**
 * «Вход и безопасность» для контроллеров обеих аудиторий (TASK-738): аккаунт один, поэтому и
 * правила одни; приложение решает только, какие провайдеры в нём доступны и чьи куки снимать.
 */
@Injectable()
export class AccountSecurityHttpService {
    constructor(
        private readonly security: AccountSecurityService,
        private readonly changePassword: ChangeAccountPasswordUseCase,
        private readonly unlinkProvider: UnlinkProviderUseCase,
        private readonly linkIdentity: LinkIdentityUseCase,
        private readonly registry: IdentityProviderRegistry,
        private readonly cookies: SessionCookiesService
    ) {}

    overview(user: AuthenticatedUser): Promise<AccountSecurityDto> {
        return this.security.overview(user.userId, user.audience);
    }

    async setPassword(
        user: AuthenticatedUser,
        dto: ChangeAccountPasswordDto
    ): Promise<AccountSecurityDto> {
        await this.changePassword.execute({
            userId: user.userId,
            sessionId: user.sessionId,
            currentPassword: dto.currentPassword,
            newPassword: dto.newPassword,
        });
        return this.overview(user);
    }

    /** Привязка виджет-провайдера: подписанный ответ виджета проверяет адаптер аудитории. */
    async linkWidget(
        user: AuthenticatedUser,
        provider: string,
        payload: Record<string, unknown>
    ): Promise<AccountSecurityDto> {
        try {
            const adapter = this.registry.widget(provider, user.audience);
            await this.linkIdentity.execute(user.userId, adapter.verify(user.audience, payload));
        } catch (error: unknown) {
            throw toIdentityHttpError(error);
        }
        return this.overview(user);
    }

    async unlink(user: AuthenticatedUser, provider: string): Promise<AccountSecurityDto> {
        let key;
        try {
            key = this.registry.keyOf(provider);
        } catch (error: unknown) {
            throw toIdentityHttpError(error);
        }
        await this.unlinkProvider.execute(user.userId, key);
        return this.overview(user);
    }

    async signOutEverywhere(
        user: AuthenticatedUser,
        audience: SessionAudience,
        response: Response
    ): Promise<void> {
        await this.security.signOutEverywhere(user.userId);
        this.cookies.clear(response, audience);
    }
}

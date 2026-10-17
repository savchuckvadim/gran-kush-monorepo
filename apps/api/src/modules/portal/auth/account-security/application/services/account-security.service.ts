import { Injectable, NotFoundException } from "@nestjs/common";

import { IdentityProviderRegistry } from "@modules/portal/auth/identity/application/identity-provider.registry";
import type { IdentityProviderKey } from "@modules/portal/auth/identity/domain/identity-provider";
import {
    type LinkedIdentity,
    UserIdentityRepository,
} from "@modules/portal/auth/identity/domain/repositories/user-identity-repository.interface";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

/** Способ входа через провайдера, как его видит владелец аккаунта. */
export interface SignInMethodView {
    provider: IdentityProviderKey;
    flow: "redirect" | "widget";
    /** Провайдер настроен в этом приложении: можно привязать и войти */
    available: boolean;
    linked: boolean;
    email: string | null;
    username: string | null;
}

export interface AccountSecurity {
    email: string;
    hasPassword: boolean;
    methods: SignInMethodView[];
}

/** Способы входа аккаунта: пароль и привязки. */
export interface SignInMethods {
    email: string;
    hasPassword: boolean;
    linked: LinkedIdentity[];
}

/** «Вход и безопасность»: способы входа аккаунта и выход со всех устройств. */
@Injectable()
export class AccountSecurityService {
    constructor(
        private readonly users: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly registry: IdentityProviderRegistry,
        private readonly sessions: SessionsService
    ) {}

    async signInMethods(userId: string): Promise<SignInMethods> {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException("Account not found");
        const linked = await this.identities.listForUser(userId);
        return { email: user.email, hasPassword: user.passwordHash !== null, linked };
    }

    /**
     * Провайдеры приложения и привязки аккаунта. Привязанный способ виден и там, где провайдер
     * не настроен: его можно отвязать.
     */
    async overview(userId: string, audience: SessionAudience): Promise<AccountSecurity> {
        const methods = await this.signInMethods(userId);
        const views = this.registry.all(audience).map((provider): SignInMethodView => {
            const link = methods.linked.find((identity) => identity.provider === provider.key);
            return {
                provider: provider.key,
                flow: provider.flow,
                available: provider.available,
                linked: link !== undefined,
                email: link?.email ?? null,
                username: link?.username ?? null,
            };
        });
        return {
            email: methods.email,
            hasPassword: methods.hasPassword,
            methods: views.filter((view) => view.available || view.linked),
        };
    }

    /**
     * Снять все сессии аккаунта — кабинета и CRM, на всех устройствах: аккаунт и пароль у них
     * общие. Отзыв действует сразу: гвард проверяет сессию на каждый запрос.
     */
    async signOutEverywhere(userId: string): Promise<void> {
        await this.sessions.endAllForUser(userId, "sign_out_everywhere");
    }
}

import { Injectable, UnauthorizedException } from "@nestjs/common";

import { IdentityProvider, UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";
import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

/** Вход в CRM через Google: аккаунт и есть ли у него клубы (без клубов CRM ведёт на «Новый клуб»). */
export interface EmployeeSocialLogin {
    user: User;
    hasClubs: boolean;
}

/**
 * Вход через Google: подтверждённый Google-ом email — то же доказательство владения
 * адресом, что и ссылка из письма. Поэтому вход клеймит pending_claim аккаунты.
 *
 * Ожидающие членства вход НЕ подтверждает: их мог завести кто угодно, вписав чужой email,
 * и первый же вход через Google молча записал бы человека в чужой клуб. Подтверждает
 * владелец сам, явно: в кабинете (`/cabinet/memberships`) или по ссылке из письма (TASK-703).
 */
@Injectable()
export class SocialLoginService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly refreshTokens: RefreshTokenRepository
    ) {}

    /** Кабинет: аккаунта нет — создаём (без клуба; вступит по ссылке или регистрации). */
    async loginMemberWithGoogle(profile: GoogleProfile): Promise<User> {
        return this.findOrCreateAccount(profile);
    }

    /**
     * Аккаунт для подтверждённого Google-ом адреса: привязанный, найденный по email (и тогда
     * заявленный этим входом) или новый. Нужен везде, где Google доказывает владение адресом:
     * вход в кабинет, приём приглашения сотрудника.
     */
    async findOrCreateAccount(profile: GoogleProfile): Promise<User> {
        const existing = await this.findLinkedOrByEmail(profile);
        if (existing) {
            return this.activateAndLink(existing, profile);
        }
        const user = await this.userRepository.create({
            email: profile.email,
            passwordHash: null,
            status: UserAccountStatus.active,
            isActive: true,
            emailConfirmed: true,
            displayName: profile.displayName ?? undefined,
        });
        await this.linkIdentity(user.id, profile);
        return user;
    }

    /**
     * CRM: аккаунт находится или заводится всегда — Google доказал адрес. Аккаунт без клубов
     * получает сессию и заводит клуб на странице «Новый клуб» (TASK-708); маршруты клуба всё
     * равно требуют сотрудника этого клуба.
     */
    async loginEmployeeWithGoogle(profile: GoogleProfile): Promise<EmployeeSocialLogin> {
        const user = await this.findOrCreateAccount(profile);
        const withMemberships = await this.userRepository.findByEmailWithMemberships(user.email);
        const hasClubs = (withMemberships?.employees ?? []).some((e) => e.isActive);
        return { user, hasClubs };
    }

    private async findLinkedOrByEmail(profile: GoogleProfile): Promise<User | null> {
        if (!profile.emailVerified) {
            throw new UnauthorizedException("Google email is not verified");
        }
        const linkedUserId = await this.identities.findUserIdByProvider(
            IdentityProvider.google,
            profile.providerUserId
        );
        if (linkedUserId) {
            const user = await this.userRepository.findById(linkedUserId);
            if (user) {
                return user;
            }
        }
        return this.userRepository.findByEmail(profile.email);
    }

    private async activateAndLink(user: User, profile: GoogleProfile): Promise<User> {
        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }

        let current = user;
        const needsClaim =
            !current.emailConfirmed ||
            !current.isActive ||
            current.status === UserAccountStatus.pending_claim;
        if (needsClaim) {
            // Пароль неподтверждённого аккаунта мог задать не владелец адреса (TASK-664):
            // владелец только что доказал адрес Google-ом — пароль сбрасываем, сессии отзываем.
            const dropPassword = !current.emailConfirmed && current.passwordHash !== null;
            current = await this.userRepository.update(current.id, {
                status: UserAccountStatus.active,
                isActive: true,
                emailConfirmed: true,
                emailVerificationToken: null,
                emailVerificationExpiresAt: null,
                ...(dropPassword ? { passwordHash: null } : {}),
            });
            await this.refreshTokens.revokeAllForUser(current.id);
        }

        await this.linkIdentity(current.id, profile);
        return current;
    }

    private async linkIdentity(userId: string, profile: GoogleProfile): Promise<void> {
        await this.identities.link({
            userId,
            provider: IdentityProvider.google,
            providerUserId: profile.providerUserId,
            email: profile.email,
            emailVerified: profile.emailVerified,
            displayName: profile.displayName,
            givenName: profile.givenName,
            familyName: profile.familyName,
            locale: profile.locale,
        });
    }
}

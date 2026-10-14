import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { ClaimedMembershipRepository } from "@modules/portal/auth/shared/domain/repositories/claimed-membership-repository.interface";
import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";
import { UserIdentityRepository } from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

const GOOGLE_PROVIDER = "google";

export type EmployeeSocialLoginResult =
    | { kind: "ok"; user: User }
    | { kind: "no_employment"; email: string };

/**
 * Вход через Google: подтверждённый Google-ом email — то же доказательство владения
 * адресом, что и ссылка из письма. Поэтому вход клеймит pending_claim аккаунты
 * и подтверждает членства, ждавшие клейма (как resetPassword).
 */
@Injectable()
export class SocialLoginService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly identities: UserIdentityRepository,
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly claimedMemberships: ClaimedMembershipRepository
    ) {}

    /** Кабинет: аккаунта нет — создаём (без клуба; вступит по ссылке или регистрации). */
    async loginMemberWithGoogle(profile: GoogleProfile): Promise<User> {
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
     * CRM: аккаунт не создаём — без клуба employee-сессия бесполезна;
     * фронт ведёт на регистрацию клуба с предзаполненным email.
     */
    async loginEmployeeWithGoogle(profile: GoogleProfile): Promise<EmployeeSocialLoginResult> {
        const existing = await this.findLinkedOrByEmail(profile);
        if (!existing) {
            return { kind: "no_employment", email: profile.email };
        }
        const user = await this.activateAndLink(existing, profile);
        const withMemberships = await this.userRepository.findByEmailWithMemberships(user.email);
        const activeEmployments = withMemberships?.employees.filter((e) => e.isActive) ?? [];
        if (activeEmployments.length === 0) {
            return { kind: "no_employment", email: user.email };
        }
        return { kind: "ok", user };
    }

    private async findLinkedOrByEmail(profile: GoogleProfile): Promise<User | null> {
        if (!profile.emailVerified) {
            throw new UnauthorizedException("Google email is not verified");
        }
        const linkedUserId = await this.identities.findUserIdByProvider(
            GOOGLE_PROVIDER,
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
            await this.claimedMemberships.confirmPendingSelfJoins(current.id);
        }

        await this.linkIdentity(current.id, profile);
        return current;
    }

    private async linkIdentity(userId: string, profile: GoogleProfile): Promise<void> {
        await this.identities.link({
            userId,
            provider: GOOGLE_PROVIDER,
            providerUserId: profile.providerUserId,
            email: profile.email,
            displayName: profile.displayName,
        });
    }
}

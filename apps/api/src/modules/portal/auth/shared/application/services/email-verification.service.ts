import { Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@mail/consts/mail.constants";
import { UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { hash } from "bcrypt";

import { hashSecretToken, issueSecretToken } from "@common/crypto/secret-token";
import { ClaimedMembershipRepository } from "@modules/portal/auth/shared/domain/repositories/claimed-membership-repository.interface";
import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";

/** Which frontend the link in the email opens: CRM for employees, member portal for members. */
export type AuthMailApp = "crm" | "member";

export interface AuthMailOptions {
    app: AuthMailApp;
    language?: SupportedLanguage;
}

const MEMBER_MAIL: AuthMailOptions = { app: "member" };
const ACCOUNT_SETUP_TTL_DAYS = 7;

@Injectable()
export class EmailVerificationService {
    private readonly logger = new Logger(EmailVerificationService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly claimedMemberships: ClaimedMembershipRepository
    ) {}

    /**
     * Отправка письма подтверждения глобальному аккаунту.
     */
    async sendVerificationEmailToUserId(
        userId: string,
        options: AuthMailOptions = MEMBER_MAIL
    ): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user || user.emailConfirmed || user.status === UserAccountStatus.blocked) {
            return;
        }

        const { token, hash: tokenHash } = issueSecretToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await this.userRepository.update(user.id, {
            emailVerificationToken: tokenHash,
            emailVerificationExpiresAt: expiresAt,
        });

        const recipient = { name: user.displayName ?? user.email, surname: null };
        const language = options.language ?? DEFAULT_LANGUAGE;
        if (options.app === "crm") {
            await this.mailService.sendEmployeeEmailVerification(
                recipient,
                { id: user.id, email: user.email },
                token,
                language
            );
        } else {
            await this.mailService.sendMemberEmailVerification(
                recipient,
                { id: user.id, email: user.email },
                token,
                language
            );
        }
    }

    /**
     * Публичная повторная отправка письма подтверждения по email. Молчит про то,
     * существует ли адрес: ответ один и тот же. Нужна тем, кто ещё не может войти
     * (неподтверждённый участник или приглашённый сотрудник потерял письмо).
     */
    async resendConfirmationByEmail(email: string, options: AuthMailOptions): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return;
        }
        try {
            await this.sendVerificationEmailToUserId(user.id, options);
        } catch (error: unknown) {
            // Ответ одинаков для любого адреса; сбой почты не должен его менять
            this.logger.error(
                `Resend confirmation for user ${user.id} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }
    }

    /**
     * Подтверждение email по токену
     */
    async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepository.findByEmailVerificationToken(hashSecretToken(token));

        if (!user) {
            throw new NotFoundException("Invalid verification token");
        }

        if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
            throw new UnauthorizedException("Verification token has expired");
        }

        // Заблокированный аккаунт ссылка из старого письма не реанимирует
        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }

        if (user.emailConfirmed) {
            return {
                success: true,
                message: "Email already confirmed",
            };
        }

        // Подтверждаем email и активируем пользователя
        await this.userRepository.update(user.id, {
            emailConfirmed: true,
            isActive: true,
            emailVerificationToken: null,
            emailVerificationExpiresAt: null,
        });

        return {
            success: true,
            message: "Email confirmed successfully",
        };
    }

    /**
     * Аккаунт без пароля (его завёл клуб): письмо со ссылкой задать пароль. Механика та же, что у
     * сброса, но свой текст и 7 дней на ответ. Так аккаунт и клеймится: пароль ставит только тот,
     * кто открыл письмо (TASK-664). Аккаунт с паролем это письмо не получает — для него есть сброс.
     * Сбой отправки не роняет вызывающий сценарий: аккаунт или членство уже созданы.
     */
    async sendAccountSetup(
        email: string,
        options: AuthMailOptions & { portalName?: string }
    ): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        if (!user || user.passwordHash !== null || user.status === UserAccountStatus.blocked) {
            return;
        }

        const { token, hash: tokenHash } = issueSecretToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ACCOUNT_SETUP_TTL_DAYS);
        await this.userRepository.update(user.id, {
            resetPasswordToken: tokenHash,
            resetPasswordExpiresAt: expiresAt,
        });

        try {
            await this.mailService.sendAccountSetup({
                to: user.email,
                token,
                app: options.app,
                portalName: options.portalName,
                language: options.language ?? DEFAULT_LANGUAGE,
            });
        } catch (error: unknown) {
            this.logger.error(
                `Account setup email for user ${user.id} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }
    }

    /**
     * Запрос на сброс пароля
     */
    async requestPasswordReset(
        email: string,
        options: AuthMailOptions = MEMBER_MAIL
    ): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepository.findByEmail(email);

        // Не раскрываем, существует ли пользователь; блокировку сброс не снимает
        if (!user || user.status === UserAccountStatus.blocked) {
            return {
                success: true,
                message: "If the email exists, a password reset link has been sent",
            };
        }

        const { token, hash: tokenHash } = issueSecretToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

        await this.userRepository.update(user.id, {
            resetPasswordToken: tokenHash,
            resetPasswordExpiresAt: expiresAt,
        });

        await this.mailService.sendPasswordReset(
            { id: user.id, email: user.email },
            user.displayName ?? user.email,
            token,
            options.language ?? DEFAULT_LANGUAGE,
            options.app === "crm" ? "crm" : "site"
        );

        return {
            success: true,
            message: "If the email exists, a password reset link has been sent",
        };
    }

    /**
     * Сброс пароля по токену
     */
    async resetPassword(
        token: string,
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepository.findByResetPasswordToken(hashSecretToken(token));

        if (!user) {
            throw new NotFoundException("Invalid reset token");
        }

        if (!user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
            throw new UnauthorizedException("Reset token has expired");
        }

        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }

        const passwordHash = await hash(newPassword, 10);

        // Ссылка из письма доказывает владение адресом, поэтому email заодно подтверждается,
        // а аккаунт без пароля, заведённый клубом, так и клеймится (TASK-664)
        await this.userRepository.update(user.id, {
            passwordHash,
            status: UserAccountStatus.active,
            emailConfirmed: true,
            isActive: true,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        });

        // Сброс пароля обязан выкидывать все остальные сессии: если аккаунт угнали,
        // смена пароля без этого ничего не даёт — refresh-токен злоумышленника живёт
        // ещё 7 дней и молча выписывает новые access-токены.
        await this.refreshTokenRepository.revokeAllForUser(user.id);

        // Клейм доказан этой же ссылкой: членства, созданные саморегистрацией
        // с этим email до клейма, перестают ждать подтверждения
        await this.claimedMemberships.confirmPendingSelfJoins(user.id);

        return {
            success: true,
            message: "Password reset successfully",
        };
    }
}

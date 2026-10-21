import { Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@mail/consts/mail.constants";
import { UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { hash } from "bcrypt";

import { withMinDuration } from "@common/time/min-duration.util";
import { EMAIL_LOOKUP_MIN_RESPONSE_MS } from "@modules/portal/auth/domain/constants/email-lookup.constants";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { ClaimedMembershipRepository } from "@modules/portal/auth/shared/domain/repositories/claimed-membership-repository.interface";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import {
    AUTH_TOKEN_PURPOSES,
    type ConsumeAuthTokenResult,
} from "@modules/portal/auth/tokens/domain/auth-token";

/** Which frontend the link in the email opens: CRM for employees, member portal for members. */
export type AuthMailApp = "crm" | "member";

export interface AuthMailOptions {
    app: AuthMailApp;
    language?: SupportedLanguage;
}

const MEMBER_MAIL: AuthMailOptions = { app: "member" };

/** Форма нового пароля принимает и сброс, и первый пароль аккаунта, заведённого клубом. */
const PASSWORD_LINKS = [AUTH_TOKEN_PURPOSES.PasswordReset, AUTH_TOKEN_PURPOSES.AccountSetup];

/** Аккаунт ссылки или ошибка с прежними текстами ответа: 404 — нет такой ссылки, 401 — истекла. */
const userOfLink = (
    result: ConsumeAuthTokenResult,
    messages: { invalid: string; expired: string }
): string => {
    if (result.kind === "expired") throw new UnauthorizedException(messages.expired);
    if (result.kind === "invalid" || !result.token.userId) {
        throw new NotFoundException(messages.invalid);
    }
    return result.token.userId;
};

@Injectable()
export class EmailVerificationService {
    private readonly logger = new Logger(EmailVerificationService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly sessions: SessionsService,
        private readonly claimedMemberships: ClaimedMembershipRepository,
        private readonly authTokens: AuthTokensService
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

        const { token } = await this.authTokens.issue(AUTH_TOKEN_PURPOSES.EmailVerification, {
            userId: user.id,
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
        await withMinDuration(EMAIL_LOOKUP_MIN_RESPONSE_MS, async () => {
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
        });
    }

    /** Подтверждение почты ссылкой из письма; ссылка гасится. */
    async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
        const userId = userOfLink(
            await this.authTokens.consume(AUTH_TOKEN_PURPOSES.EmailVerification, token),
            { invalid: "Invalid verification token", expired: "Verification token has expired" }
        );
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException("Invalid verification token");
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
        await this.userRepository.update(user.id, { emailConfirmed: true, isActive: true });

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

        const { token } = await this.authTokens.issue(AUTH_TOKEN_PURPOSES.AccountSetup, {
            userId: user.id,
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
     * Регистрация на адрес, у которого уже есть аккаунт (TASK-665): владельцу — письмо «войдите».
     * Сбой почты не меняет ответа регистрации: он одинаков для любого адреса.
     */
    async notifyAccountExists(email: string, language?: SupportedLanguage): Promise<void> {
        try {
            await this.mailService.sendAccountExists({
                to: email,
                language: language ?? DEFAULT_LANGUAGE,
            });
        } catch (error: unknown) {
            this.logger.error(
                "Account exists email was not queued",
                error instanceof Error ? error.stack : String(error)
            );
        }
    }

    /**
     * Запрос на сброс пароля. Не раскрывает, есть ли аккаунт: ответ один и тот же по тексту и по
     * времени (`EMAIL_LOOKUP_MIN_RESPONSE_MS`), сбой почты его не меняет.
     */
    async requestPasswordReset(
        email: string,
        options: AuthMailOptions = MEMBER_MAIL
    ): Promise<{ success: boolean; message: string }> {
        await withMinDuration(EMAIL_LOOKUP_MIN_RESPONSE_MS, () =>
            this.sendPasswordResetIfAllowed(email, options)
        );
        return {
            success: true,
            message: "If the email exists, a password reset link has been sent",
        };
    }

    private async sendPasswordResetIfAllowed(
        email: string,
        options: AuthMailOptions
    ): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        // Блокировку сброс не снимает
        if (!user || user.status === UserAccountStatus.blocked) {
            return;
        }
        try {
            const { token } = await this.authTokens.issue(AUTH_TOKEN_PURPOSES.PasswordReset, {
                userId: user.id,
            });
            await this.mailService.sendPasswordReset(
                { id: user.id, email: user.email },
                user.displayName ?? user.email,
                token,
                options.language ?? DEFAULT_LANGUAGE,
                options.app === "crm" ? "crm" : "site"
            );
        } catch (error: unknown) {
            this.logger.error(
                `Password reset for user ${user.id} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }
    }

    /** Новый пароль по ссылке сброса или первого пароля; ссылка гасится. */
    async resetPassword(
        token: string,
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        const userId = userOfLink(await this.authTokens.consume(PASSWORD_LINKS, token), {
            invalid: "Invalid reset token",
            expired: "Reset token has expired",
        });
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException("Invalid reset token");
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
        });
        // Почта подтверждена и пароль задан — прочие ссылки из писем больше не нужны
        await this.authTokens.revokeForUser(user.id, [
            ...PASSWORD_LINKS,
            AUTH_TOKEN_PURPOSES.EmailVerification,
        ]);

        // Сброс пароля обязан выкидывать все остальные сессии: если аккаунт угнали,
        // смена пароля без этого ничего не даёт — refresh-токен злоумышленника живёт
        // ещё 7 дней и молча выписывает новые access-токены.
        await this.sessions.endAllForUser(user.id, "password_reset");

        // Клейм доказан этой же ссылкой: членства, созданные саморегистрацией
        // с этим email до клейма, перестают ждать подтверждения
        await this.claimedMemberships.confirmPendingSelfJoins(user.id);

        return {
            success: true,
            message: "Password reset successfully",
        };
    }
}

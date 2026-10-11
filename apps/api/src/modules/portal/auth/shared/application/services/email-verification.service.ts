import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@mail/consts/mail.constants";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { hash } from "bcrypt";
import { randomBytes } from "crypto";

import { RefreshTokenRepository } from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";

/** Which frontend the link in the email opens: CRM for employees, member portal for members. */
export type AuthMailApp = "crm" | "member";

export interface AuthMailOptions {
    app: AuthMailApp;
    language?: SupportedLanguage;
}

const MEMBER_MAIL: AuthMailOptions = { app: "member" };

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly refreshTokenRepository: RefreshTokenRepository
    ) {}

    /**
     * Генерация токена для подтверждения email
     */
    private generateVerificationToken(): string {
        return randomBytes(32).toString("hex");
    }

    /**
     * Генерация токена для сброса пароля
     */
    private generateResetToken(): string {
        return randomBytes(32).toString("hex");
    }

    /**
     * Отправка письма подтверждения глобальному аккаунту.
     */
    async sendVerificationEmailToUserId(
        userId: string,
        options: AuthMailOptions = MEMBER_MAIL
    ): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user || user.emailConfirmed) {
            return;
        }

        const token = this.generateVerificationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await this.userRepository.update(user.id, {
            emailVerificationToken: token,
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
            await this.mailService.sendMamberEmailVerification(
                recipient,
                { id: user.id, email: user.email },
                token,
                language
            );
        }
    }

    /**
     * Подтверждение email по токену
     */
    async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepository.findByEmailVerificationToken(token);

        if (!user) {
            throw new NotFoundException("Invalid verification token");
        }

        if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
            throw new UnauthorizedException("Verification token has expired");
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
     * Запрос на сброс пароля
     */
    async requestPasswordReset(
        email: string,
        options: AuthMailOptions = MEMBER_MAIL
    ): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            // Не раскрываем, существует ли пользователь
            return {
                success: true,
                message: "If the email exists, a password reset link has been sent",
            };
        }

        const token = this.generateResetToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

        await this.userRepository.update(user.id, {
            resetPasswordToken: token,
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
        const user = await this.userRepository.findByResetPasswordToken(token);

        if (!user) {
            throw new NotFoundException("Invalid reset token");
        }

        if (!user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
            throw new UnauthorizedException("Reset token has expired");
        }

        const passwordHash = await hash(newPassword, 10);

        // Ссылка из письма доказывает владение адресом, поэтому email заодно подтверждается
        await this.userRepository.update(user.id, {
            passwordHash,
            emailConfirmed: true,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        });

        // Сброс пароля обязан выкидывать все остальные сессии: если аккаунт угнали,
        // смена пароля без этого ничего не даёт — refresh-токен злоумышленника живёт
        // ещё 7 дней и молча выписывает новые access-токены.
        await this.refreshTokenRepository.revokeAllForUser(user.id);

        return {
            success: true,
            message: "Password reset successfully",
        };
    }
}

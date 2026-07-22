import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomBytes } from "crypto";

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService
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
    async sendVerificationEmailToUserId(userId: string): Promise<void> {
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

        await this.mailService.sendMamberEmailVerification(
            {
                name: user.displayName ?? user.email,
                surname: null,
            },
            { id: user.id, email: user.email },
            token
        );
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
    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
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
            "",
            token
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

        // Хешируем новый пароль
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль и очищаем токен
        await this.userRepository.update(user.id, {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        });

        return {
            success: true,
            message: "Password reset successfully",
        };
    }
}

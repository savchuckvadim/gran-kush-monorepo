import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { Employee } from "@employees/domain/entity/employee.entity";
import { MailService } from "@mail/application/services/mail.service";
import { Member } from "@members/domain/entity/member.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomBytes } from "crypto";

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
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
     * Отправка email для подтверждения при регистрации члена
     */
    async sendMemberVerificationEmail(
        member: { id: string; userId: string; name: string; surname?: string | null },
        user: { id: string; email: string }
    ): Promise<void> {
        const token = this.generateVerificationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Токен действителен 24 часа

        // Сохраняем токен в User
        await this.userRepository.update(user.id, {
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt,
        });

        // Отправляем email
        await this.mailService.sendMamberEmailVerification(
            {
                id: member.id,
                userId: member.userId,
                name: member.name,
                surname: member.surname || null,
            } as any,
            { id: user.id, email: user.email } as any,
            token
        );
    }

    /**
     * Отправка email для подтверждения при регистрации сотрудника
     */
    async sendEmployeeVerificationEmail(
        employee: Employee,
        user: { id: string; email: string }
    ): Promise<void> {
        const token = this.generateVerificationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Токен действителен 24 часа

        // Сохраняем токен в User
        await this.userRepository.update(user.id, {
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt,
        });

        // Отправляем email (используем имя сотрудника)
        await this.mailService.sendEmployeeEmailVerification(
            {
                id: employee.id,
                userId: employee.userId,
                name: employee.name,
                surname: employee.surname || null,
            } as any,
            { id: user.id, email: user.email } as any,
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

        // Сохраняем токен в User
        await this.userRepository.update(user.id, {
            resetPasswordToken: token,
            resetPasswordExpiresAt: expiresAt,
        });

        // Определяем имя пользователя (из Member или Employee)
        const userWithRelations = await this.userRepository.findByEmailWithRelations(email);
        const name = userWithRelations?.member?.name || userWithRelations?.employee?.name || "";
        const surname =
            userWithRelations?.member?.surname || userWithRelations?.employee?.surname || "";

        // Отправляем email
        await this.mailService.sendPasswordReset(
            { id: user.id, email: user.email } as any,
            name,
            surname || "",
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

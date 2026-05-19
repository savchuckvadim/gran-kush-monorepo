import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomBytes } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    buildMemberFieldMap,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly prisma: PrismaService
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
        member: { id: string; userId: string; name: string; surname: string | null },
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
                name: member.name,
                surname: member.surname,
            },
            user,
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
            { name: employee.name, surname: employee.surname ?? null },
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

        // Сохраняем токен в User
        await this.userRepository.update(user.id, {
            resetPasswordToken: token,
            resetPasswordExpiresAt: expiresAt,
        });

        const userWithRelations = await this.userRepository.findByEmailWithRelations(email);
        let name = "";
        let surname = "";
        if (userWithRelations?.member) {
            const m = await this.prisma.member.findUnique({
                where: { id: userWithRelations.member.id },
                select: {
                    profile: {
                        select: {
                            fieldValues: {
                                select: {
                                    valueJson: true,
                                    fieldDefinition: { select: { fieldKey: true } },
                                },
                            },
                        },
                    },
                },
            });
            if (m?.profile?.fieldValues?.length) {
                const fieldMap = buildMemberFieldMap(
                    m.profile.fieldValues.map((fv) => ({
                        valueJson: fv.valueJson,
                        fieldDefinition: fv.fieldDefinition,
                    }))
                );
                const parts = getMemberDisplayNameParts(fieldMap);
                name = parts.firstName;
                surname = parts.lastName ?? "";
            }
        } else if (userWithRelations?.employee) {
            name = userWithRelations.employee.name ?? "";
            surname = userWithRelations.employee.surname ?? "";
        }

        // Отправляем email
        await this.mailService.sendPasswordReset(
            { id: user.id, email: user.email },
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

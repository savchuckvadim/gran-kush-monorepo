import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import * as bcrypt from "bcrypt";

import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { BCRYPT_ROUNDS } from "@modules/users/domain/password-hashing";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

import { ACCOUNT_SECURITY_ERRORS } from "../../domain/account-security-errors";

/**
 * Задать или сменить пароль аккаунта (TASK-716). Правила:
 * - пароль уже есть — нужен текущий: открытая на чужом устройстве сессия не должна менять пароль
 *   молча (`wrong_password`);
 * - пароля нет (вход только через Google) — задаётся без текущего: владение аккаунтом уже доказано
 *   входом через Google;
 * - после смены отзываются все остальные сессии аккаунта, в кабинете и CRM: угнанная сессия не
 *   переживает смену пароля, а текущая — та, что пароль и сменила, — остаётся.
 */
@Injectable()
export class ChangeAccountPasswordUseCase {
    constructor(
        private readonly users: UserRepository,
        private readonly sessions: SessionsService
    ) {}

    async execute(command: {
        userId: string;
        /** Сессия, из которой меняют пароль: её не отзываем */
        sessionId: string;
        currentPassword?: string;
        newPassword: string;
    }): Promise<{ id: string; email: string }> {
        const user = await this.users.findById(command.userId);
        if (!user) throw new NotFoundException("Account not found");

        if (user.passwordHash !== null) {
            const matches =
                command.currentPassword !== undefined &&
                (await bcrypt.compare(command.currentPassword, user.passwordHash));
            if (!matches) {
                throw new BadRequestException({
                    message: "Current password is wrong",
                    code: ACCOUNT_SECURITY_ERRORS.wrongPassword,
                });
            }
        }

        await this.users.update(user.id, {
            passwordHash: await bcrypt.hash(command.newPassword, BCRYPT_ROUNDS),
            // ссылка сброса пароля из старого письма после смены не нужна
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        });
        await this.sessions.endAllForUser(user.id, "password_changed", command.sessionId);
        return { id: user.id, email: user.email };
    }
}

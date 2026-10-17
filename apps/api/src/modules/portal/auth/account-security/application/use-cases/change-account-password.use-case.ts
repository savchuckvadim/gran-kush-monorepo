import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import * as bcrypt from "bcrypt";

import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";
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
        private readonly sessions: SessionsService,
        private readonly authTokens: AuthTokensService
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
        });
        // ссылка сброса из старого письма после смены пароля не должна его перебить
        await this.authTokens.revokeForUser(user.id, [
            AUTH_TOKEN_PURPOSES.PasswordReset,
            AUTH_TOKEN_PURPOSES.AccountSetup,
        ]);
        await this.sessions.endAllForUser(user.id, "password_changed", command.sessionId);
        return { id: user.id, email: user.email };
    }
}

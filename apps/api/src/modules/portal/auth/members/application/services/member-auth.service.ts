import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { MemberLoginDto } from "@modules/portal/auth/members/api/dto/member-login.dto";

/**
 * Вход в кабинет паролем. Решает только, кого впустить; сессию выдаёт `SessionHttpService`.
 * Клуб резолвится на каждый запрос (`MembershipGuard`).
 */
@Injectable()
export class MemberAuthService {
    constructor(private readonly userRepository: UserRepository) {}

    async verifyCredentials(dto: MemberLoginDto): Promise<User> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }
        // После проверки пароля: иначе ответ выдавал бы, что адрес зарегистрирован (TASK-665).
        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }
        // Пароль неподтверждённого аккаунта мог задать не владелец адреса (TASK-664)
        if (!user.isActive || !user.emailConfirmed) {
            throw new UnauthorizedException("Email not confirmed");
        }
        return user;
    }
}

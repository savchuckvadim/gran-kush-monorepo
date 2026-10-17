import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { UserWithMemberships } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";

/**
 * Вход в CRM паролем. Решает только, кого впустить; сессию выдаёт `SessionHttpService`.
 * Конкретный клуб резолвится на каждый запрос (`MembershipGuard`).
 */
@Injectable()
export class EmployeeAuthService {
    constructor(private readonly userRepository: UserRepository) {}

    async verifyCredentials(dto: EmployeeLoginDto): Promise<UserWithMemberships> {
        const user = await this.userRepository.findByEmailWithMemberships(dto.email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }
        // После проверки пароля, чтобы ответ не выдавал, что адрес зарегистрирован (TASK-665).
        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }
        // Владелец клуба активен с регистрации и входит до подтверждения почты (решение 2026-10-14)
        if (!user.isActive) {
            throw new UnauthorizedException("Email not confirmed");
        }
        // Аккаунт без клубов тоже входит: пароль доказал владельца, а CRM предложит завести клуб
        // (TASK-708). Маршруты клуба всё равно требуют сотрудника в этом клубе (MembershipGuard).
        return user;
    }
}

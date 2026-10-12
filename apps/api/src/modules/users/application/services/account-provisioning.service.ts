import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

/**
 * Единая точка жизненного цикла аккаунта: создание pending_claim клубом
 * и создание/клейм с паролем в публичных флоу (инвайт, ссылка-форма).
 */
@Injectable()
export class AccountProvisioningService {
    constructor(private readonly userRepository: UserRepository) {}

    /** CRM создаёт участника/сотрудника по email: аккаунт без пароля, ждёт клейма. */
    async ensurePendingClaimUser(email: string): Promise<{ user: User; isNewUser: boolean }> {
        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            return { user: existing, isNewUser: false };
        }
        const user = await this.userRepository.create({
            email,
            passwordHash: null,
            status: UserAccountStatus.pending_claim,
            isActive: false,
            emailConfirmed: false,
        });
        return { user, isNewUser: true };
    }

    /**
     * Публичный флоу: найти аккаунт, либо создать/заклеймить его с паролем.
     * `emailVerified: true` — когда владение адресом доказано (ссылка пришла на email):
     * тогда аккаунт сразу активируется с подтверждённым email.
     * `verifyPassword: true` — у существующего аккаунта пароль должен совпасть: иначе любой,
     * кто знает чужой email, вступал бы в клуб от его имени и открывал клубу его документы.
     */
    async ensureUserWithPassword(
        email: string,
        password: string | undefined,
        options: { emailVerified: boolean; verifyPassword?: boolean }
    ): Promise<{ user: User; created: boolean; claimed: boolean }> {
        const verifiedFlags = options.emailVerified ? { isActive: true, emailConfirmed: true } : {};

        const existing = await this.userRepository.findByEmail(email);
        if (!existing) {
            if (!password) {
                throw new BadRequestException("Password is required to create an account");
            }
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const user = await this.userRepository.create({
                email,
                passwordHash,
                status: UserAccountStatus.active,
                isActive: options.emailVerified,
                emailConfirmed: options.emailVerified,
            });
            return { user, created: true, claimed: false };
        }

        if (existing.passwordHash === null) {
            if (!password) {
                throw new BadRequestException("Password is required to claim this account");
            }
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const user = await this.userRepository.update(existing.id, {
                passwordHash,
                status: UserAccountStatus.active,
                ...verifiedFlags,
            });
            return { user, created: false, claimed: true };
        }

        if (options.verifyPassword) {
            const matches = password
                ? await bcrypt.compare(password, existing.passwordHash)
                : false;
            if (!matches) {
                throw new UnauthorizedException("Invalid password for this account");
            }
        }

        return { user: existing, created: false, claimed: false };
    }
}

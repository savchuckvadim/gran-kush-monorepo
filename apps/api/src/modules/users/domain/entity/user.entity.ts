import { UserAccountStatus } from "@prisma/client";

import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

/**
 * Domain Entity - User
 * Глобальный аккаунт (без привязки к порталу).
 * Роли в порталах — мосты Member[]/Employee[].
 */
export class User {
    id: string;
    email: string;
    /** null → аккаунт создан сотрудником и ждёт клейма (pending_claim) */
    passwordHash: string | null;
    status: UserAccountStatus;
    displayName?: string;
    isActive: boolean;
    emailConfirmed: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpiresAt?: Date | null;
    resetPasswordToken?: string | null;
    resetPasswordExpiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}

export class UserWithMemberships extends User {
    employees: Employee[];
    members: Member[];
}

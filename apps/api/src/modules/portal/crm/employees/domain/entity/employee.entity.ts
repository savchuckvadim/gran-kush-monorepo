import { EmployeeRole } from "@prisma/client";

/**
 * Domain Entity - Employee
 * Мост User ↔ Portal ↔ EntityRecord: один user может быть сотрудником в нескольких порталах.
 * Профильные данные (имя, телефон, должность) живут в FieldValue профильной EntityRecord.
 */
export class Employee {
    id: string;
    userId: string;
    portalId: string;
    entityRecordId: string;
    /** Из User (заполняется при загрузке с relations) */
    email: string;
    role: EmployeeRole;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Employee>) {
        Object.assign(this, partial);
    }
}

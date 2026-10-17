/** Роль сотрудника в клубе — как её видит сотрудник и его карточка. */
export interface EmployeeRoleRef {
    id: string;
    key: string;
    /** Название своей роли; у системной — null, название даёт перевод по ключу */
    name: string | null;
    isSystem: boolean;
    permissions: string[];
}

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
    roleId: string;
    role: EmployeeRoleRef;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Employee>) {
        Object.assign(this, partial);
    }
}

/**
 * Domain Entity - Employee
 * Чистая бизнес-логика, без зависимостей от Prisma
 */
export class Employee {
    id: string;
    userId: string;
    email: string; // Из User
    passwordHash: string; // Из User
    // Личные данные
    name: string;
    surname?: string;
    phone?: string;
    // Рабочие данные
    role: string;
    position?: string;
    department?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Employee>) {
        Object.assign(this, partial);
    }
}

import { Employee } from "@employees/domain/entity/employee.entity";
import { Member } from "@members/domain/entity/member.entity";
/**
 * Domain Entity - User
 * Минимальная модель - только для аутентификации
 * Все остальные данные в Member или Employee
 */
export class User {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}

export class UserWithRelations extends User {
    employee: Employee | null;
    member: Member | null;
}

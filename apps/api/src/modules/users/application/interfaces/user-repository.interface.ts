import { User } from "@users/domain/entity/user.entity";

/**
 * Интерфейс репозитория пользователей
 * Определяет контракт для работы с пользователями
 */
export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filter?: any): Promise<User[]>;
    create(user: User): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User | null>;
    delete(id: string): Promise<void>;
    existsByEmail(email: string): Promise<boolean>;
}

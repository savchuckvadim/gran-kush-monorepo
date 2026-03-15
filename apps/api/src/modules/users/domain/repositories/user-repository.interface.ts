import { User, UserWithRelations } from "@users/domain/entity/user.entity";

export abstract class UserRepository {
    abstract findById(id: string): Promise<User | null>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findByEmailWithRelations(email: string): Promise<UserWithRelations | null>;
    abstract existsByEmail(email: string): Promise<boolean>;
    abstract create(data: { email: string; passwordHash: string }): Promise<User>;
    abstract update(
        id: string,
        data: Partial<{
            passwordHash: string;
            isActive: boolean;
        }>
    ): Promise<User>;
    abstract delete(id: string): Promise<void>;
}

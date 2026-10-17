import { UserAccountStatus } from "@prisma/client";
import { User, UserWithMemberships } from "@users/domain/entity/user.entity";

export abstract class UserRepository {
    abstract findById(id: string): Promise<User | null>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findByEmailWithMemberships(email: string): Promise<UserWithMemberships | null>;
    abstract findByIdWithMemberships(id: string): Promise<UserWithMemberships | null>;
    abstract existsByEmail(email: string): Promise<boolean>;
    abstract create(data: {
        email: string;
        passwordHash: string | null;
        status?: UserAccountStatus;
        displayName?: string;
        isActive?: boolean;
        emailConfirmed?: boolean;
    }): Promise<User>;
    abstract update(
        id: string,
        data: Partial<{
            passwordHash: string | null;
            status: UserAccountStatus;
            displayName: string | null;
            isActive: boolean;
            emailConfirmed: boolean;
            emailVerificationToken: string | null;
            emailVerificationExpiresAt: Date | null;
            resetPasswordToken: string | null;
            resetPasswordExpiresAt: Date | null;
        }>
    ): Promise<User>;

    /** Токены писем хранятся как SHA-256 (`hashSecretToken`): ищем по хешу, не по ссылке. */
    abstract findByEmailVerificationToken(tokenHash: string): Promise<User | null>;
    abstract findByResetPasswordToken(tokenHash: string): Promise<User | null>;
    abstract delete(id: string): Promise<void>;
}

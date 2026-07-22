import { UserSignature } from "@prisma/client";

export abstract class UserSignatureRepository {
    abstract findByUser(userId: string): Promise<UserSignature | null>;
    abstract upsertByUser(data: { userId: string; storagePath: string }): Promise<UserSignature>;
    abstract deleteByUser(userId: string): Promise<void>;
}

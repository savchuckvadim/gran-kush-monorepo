import { Signature } from "@prisma/client";

export abstract class SignatureRepository {
    abstract create(data: { memberId: string; storagePath: string }): Promise<Signature>;
    abstract findByMemberId(memberId: string): Promise<Signature | null>;
    abstract updateByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature>;
    abstract upsertByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature>;
    abstract deleteByMemberId(memberId: string): Promise<{ count: number }>;
}

import { MjStatus } from "@prisma/client";

export abstract class MjStatusRepository {
    abstract findByCode(code: string): Promise<MjStatus | null>;
    abstract findAll(): Promise<MjStatus[]>;
    abstract create(data: { code: string; name: string; description?: string }): Promise<MjStatus>;
}

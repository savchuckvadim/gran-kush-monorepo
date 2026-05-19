import { Document } from "@prisma/client";

export abstract class DocumentRepository {
    abstract findByType(type: string): Promise<Document | null>;
    abstract findAll(): Promise<Document[]>;
    abstract create(data: { type: string; name: string; description?: string }): Promise<Document>;
}

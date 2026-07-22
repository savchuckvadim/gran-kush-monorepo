import { Prisma, UserDocument, UserDocumentSide } from "@prisma/client";

export abstract class UserDocumentRepository {
    abstract findAllByUser(userId: string): Promise<UserDocument[]>;
    abstract findById(id: string): Promise<UserDocument | null>;
    abstract upsertByUserTypeSide(data: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        storagePath: string;
        number?: string | null;
        meta?: Prisma.InputJsonValue | null;
    }): Promise<UserDocument>;
    abstract deleteById(id: string): Promise<void>;
}

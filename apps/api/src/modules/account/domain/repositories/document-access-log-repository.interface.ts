import type { DocumentAccessAction, DocumentAccessActor } from "@prisma/client";

export interface DocumentAccessEntry {
    /** Чей аккаунт */
    userId: string;
    subject: "document" | "signature";
    documentId?: string;
    /** Членство и клуб, через которые произошло действие */
    memberId?: string;
    portalId?: string;
    actorType: DocumentAccessActor;
    /** Сотрудник клуба (Employee.id) или владелец аккаунта (User.id) */
    actorId?: string;
    action: DocumentAccessAction;
}

/** Журнал обращений к документам и подписи аккаунта. Только дозапись. */
export abstract class DocumentAccessLogRepository {
    abstract append(entry: DocumentAccessEntry): Promise<void>;
}

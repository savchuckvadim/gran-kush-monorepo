/** Клуб, которому аккаунт показал документ или подпись. */
export interface SharedClub {
    memberId: string;
    portalId: string;
    slug: string;
    displayName: string;
}

/**
 * Что из документов аккаунта видит клуб. Документы и подпись лежат на аккаунте, а строка share
 * говорит: «этому членству показано» (TASK-663). Без строки клуб документ не видит.
 *
 * Показ происходит только по явному выбору владельца аккаунта: при вступлении, подтверждении
 * или в разделе «Мой паспорт». Автоматического «показать всё» нет (TASK-704).
 */
export abstract class MemberDocumentShareRepository {
    abstract findDocumentIdsForMember(memberId: string): Promise<string[]>;
    abstract shareDocuments(memberId: string, documentIds: string[]): Promise<void>;
    abstract setSignatureShared(memberId: string, shared: boolean): Promise<void>;

    /** Убрать показ одного документа этому членству; возвращает, снят ли показ. */
    abstract revokeDocument(memberId: string, documentId: string): Promise<boolean>;
    /** Участник вышел из клуба или отозвал всё: клуб больше не видит ни документы, ни подпись. */
    abstract revokeAllForMember(memberId: string): Promise<void>;

    /** Подпись удалена: показ всем клубам снимается, иначе новая подпись открылась бы им молча. */
    abstract clearSignatureShares(userId: string): Promise<void>;

    /** Сколько ДРУГИХ членств видят эту версию документа (кроме `exceptMemberId`). */
    abstract countDocumentSharesExcept(
        documentId: string,
        exceptMemberId?: string
    ): Promise<number>;
    /** Сколько ДРУГИХ членств видят подпись аккаунта (кроме `exceptMemberId`). */
    abstract countSignatureSharesExcept(userId: string, exceptMemberId?: string): Promise<number>;

    /** Каким клубам показан каждый из документов. */
    abstract findClubsByDocumentIds(documentIds: string[]): Promise<Map<string, SharedClub[]>>;
    /** Каким клубам показана подпись аккаунта. */
    abstract findClubsWithSignature(userId: string): Promise<SharedClub[]>;

    /** Членство, которое принадлежит аккаунту, подтверждено и не закрыто; иначе `null`. */
    abstract findOwnShareableMembership(
        userId: string,
        memberId: string
    ): Promise<{ id: string; portalId: string } | null>;
}

/**
 * Что из документов аккаунта видит клуб. Документы и подпись лежат на аккаунте, а строка share
 * говорит: «этому членству показано» (TASK-663). Без строки клуб документ не видит.
 */
export abstract class MemberDocumentShareRepository {
    abstract findDocumentIdsForMember(memberId: string): Promise<string[]>;
    abstract shareDocuments(memberId: string, documentIds: string[]): Promise<void>;
    /** Все документы и подпись аккаунта — этому членству (участник вступил в клуб сам). */
    abstract shareAllOfUser(memberId: string, userId: string): Promise<void>;
    /** Документ, который загрузил сам участник, — всем его подтверждённым членствам. */
    abstract shareWithConfirmedMemberships(userId: string, documentId: string): Promise<void>;
    abstract setSignatureShared(memberId: string, shared: boolean): Promise<void>;
    abstract markSignatureSharedForConfirmedMemberships(userId: string): Promise<void>;
}

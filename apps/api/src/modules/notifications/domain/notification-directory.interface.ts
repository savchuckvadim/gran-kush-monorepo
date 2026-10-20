import type { NotificationLabel } from "./notification";

export interface StaffRecipient {
    employeeId: string;
    userId: string;
}

export interface MemberRecipient {
    memberId: string;
    userId: string;
}

/** Куда и как достучаться до адресата вне приложения. */
export interface TelegramAddress {
    chatId: string;
    /** Язык из Telegram; клиент сам решает, какой из наших языков ближе */
    locale: string | null;
}

/** Кто получает уведомление и что о нём нужно знать — в пределах одного клуба. */
export abstract class NotificationDirectory {
    /** Активные сотрудники клуба, у роли которых есть право (у владельца и админа — все права). */
    abstract staffWithPermission(portalId: string, permission: string): Promise<StaffRecipient[]>;

    /** Активный участник клуба; ушёл или чужой — `null`. */
    abstract member(portalId: string, memberId: string): Promise<MemberRecipient | null>;

    abstract userOfEmployee(portalId: string, employeeId: string): Promise<string | null>;

    abstract clubName(portalId: string): Promise<string | null>;

    abstract clubSlug(portalId: string): Promise<string | null>;

    abstract orderStage(portalId: string, stageId: string): Promise<NotificationLabel | null>;

    abstract telegramOf(userId: string): Promise<TelegramAddress | null>;
}

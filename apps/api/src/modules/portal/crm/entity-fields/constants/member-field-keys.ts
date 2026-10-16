/** Стабильные ключи системных полей member (совпадают с сидом глобальных шаблонов). */
export const MEMBER_FIELD_KEYS = {
    FIRST_NAME: "first_name",
    LAST_NAME: "last_name",
    PHONE: "phone",
    BIRTHDAY: "birthday",
    ADDRESS: "address",
    NOTES: "notes",
    IS_MEDICAL: "is_medical",
    IS_MJ: "is_mj",
    IS_RECREATION: "is_recreation",
    IDENTITY_DOCUMENT: "identity_document",
    SIGNATURE: "signature",
} as const;

export type MemberFieldKey = (typeof MEMBER_FIELD_KEYS)[keyof typeof MEMBER_FIELD_KEYS];

/**
 * Флаги, которые подтверждает клуб (решение 6): от них зависит, какие товары участник видит в
 * кабинете. В формах участника (регистрация, кабинет) их нет — клуб ставит их в CRM.
 */
export const CLUB_CONFIRMED_MEMBER_FIELD_KEYS: ReadonlySet<string> = new Set([
    MEMBER_FIELD_KEYS.IS_MEDICAL,
    MEMBER_FIELD_KEYS.IS_MJ,
    MEMBER_FIELD_KEYS.IS_RECREATION,
]);

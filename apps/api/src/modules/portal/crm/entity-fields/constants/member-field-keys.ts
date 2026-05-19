/** Стабильные ключи системных полей member (совпадают с миграцией / сидом портала). */
export const MEMBER_FIELD_KEYS = {
    FIRST_NAME: "first_name",
    LAST_NAME: "last_name",
    PHONE: "phone",
    BIRTHDAY: "birthday",
    ADDRESS: "address",
    NOTES: "notes",
    DOCUMENT_TYPE: "document_type",
    DOCUMENT_NUMBER: "document_number",
    IS_MEDICAL: "is_medical",
    IS_MJ: "is_mj",
    IS_RECREATION: "is_recreation",
} as const;

export type MemberFieldKey = (typeof MEMBER_FIELD_KEYS)[keyof typeof MEMBER_FIELD_KEYS];

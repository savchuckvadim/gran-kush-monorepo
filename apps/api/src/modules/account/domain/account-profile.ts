import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";

/** Данные человека на уровне аккаунта (решение 11): для предзаполнения анкет клубов. */
export interface AccountProfile {
    firstName: string | null;
    lastName: string | null;
    /** `YYYY-MM-DD` — день рождения без часового пояса */
    birthday: string | null;
    phone: string | null;
    address: string | null;
}

export const EMPTY_PROFILE: AccountProfile = {
    firstName: null,
    lastName: null,
    birthday: null,
    phone: null,
    address: null,
};

/**
 * Профиль как значения анкеты участника: ключи системных полей клуба (`member-field-keys`).
 * Пустые поля не попадают — анкета клуба оставляет их своими значениями по умолчанию.
 */
export const profileToMemberFields = (profile: AccountProfile): Record<string, string> => {
    const pairs: [string, string | null][] = [
        [MEMBER_FIELD_KEYS.FIRST_NAME, profile.firstName],
        [MEMBER_FIELD_KEYS.LAST_NAME, profile.lastName],
        [MEMBER_FIELD_KEYS.BIRTHDAY, profile.birthday],
        [MEMBER_FIELD_KEYS.PHONE, profile.phone],
        [MEMBER_FIELD_KEYS.ADDRESS, profile.address],
    ];
    return Object.fromEntries(pairs.filter((pair): pair is [string, string] => Boolean(pair[1])));
};

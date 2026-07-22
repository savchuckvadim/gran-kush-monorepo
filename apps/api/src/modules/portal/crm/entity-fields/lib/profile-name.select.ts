import { MEMBER_FIELD_KEYS } from "../constants/member-field-keys";

const NAME_FIELD_KEYS = [MEMBER_FIELD_KEYS.FIRST_NAME, MEMBER_FIELD_KEYS.LAST_NAME];

/**
 * Узкая проекция профильных EAV-полей для отображения имени в списках:
 * тянет только first_name/last_name вместо всего профиля.
 */
export const PROFILE_NAME_FIELD_VALUES = {
    where: { fieldDefinition: { fieldKey: { in: NAME_FIELD_KEYS } } },
    select: {
        valueJson: true,
        fieldDefinition: { select: { fieldKey: true } },
    },
} as const;

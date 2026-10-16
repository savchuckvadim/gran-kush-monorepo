import { ProductAudience } from "@prisma/client";

import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";

/**
 * Кому клуб показывает товар. Аудитория участника — его флаги в анкете (`is_medical`, `is_mj`,
 * `is_recreation`); их ставит клуб в CRM, участник сам себе их не выставляет.
 */
export const AUDIENCE_FIELD_KEYS: Readonly<Record<ProductAudience, string>> = {
    [ProductAudience.medical]: MEMBER_FIELD_KEYS.IS_MEDICAL,
    [ProductAudience.mj]: MEMBER_FIELD_KEYS.IS_MJ,
    [ProductAudience.recreation]: MEMBER_FIELD_KEYS.IS_RECREATION,
};

/** Аудитории участника по ключам его отмеченных флагов. */
export const audiencesFromFlags = (flaggedKeys: readonly string[]): ProductAudience[] =>
    Object.values(ProductAudience).filter((audience) =>
        flaggedKeys.includes(AUDIENCE_FIELD_KEYS[audience])
    );

/** Товар без аудиторий виден всем; с аудиториями — участнику хотя бы одной из них. */
export const isVisibleTo = (
    productAudiences: readonly ProductAudience[],
    memberAudiences: readonly ProductAudience[]
): boolean =>
    productAudiences.length === 0 ||
    productAudiences.some((audience) => memberAudiences.includes(audience));

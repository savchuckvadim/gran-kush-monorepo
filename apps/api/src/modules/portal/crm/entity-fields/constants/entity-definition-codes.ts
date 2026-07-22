/** Стабильные коды системных EntityDefinition на портале. */
export const ENTITY_DEFINITION_CODES = {
    MEMBER: "member",
    EMPLOYEE: "employee",
    ORDER: "order",
    PRODUCT: "product",
} as const;

export type EntityDefinitionCode =
    (typeof ENTITY_DEFINITION_CODES)[keyof typeof ENTITY_DEFINITION_CODES];

export const SYSTEM_ENTITY_CODES: readonly string[] = Object.values(ENTITY_DEFINITION_CODES);

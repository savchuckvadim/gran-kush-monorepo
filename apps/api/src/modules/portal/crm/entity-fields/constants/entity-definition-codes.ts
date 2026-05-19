/** Стабильные коды системных EntityDefinition на портале (совпадают с legacy EntityTypeCode). */
export const ENTITY_DEFINITION_CODES = {
    MEMBER: "member",
    ORDER: "order",
    PRODUCT: "product",
} as const;

export type EntityDefinitionCode =
    (typeof ENTITY_DEFINITION_CODES)[keyof typeof ENTITY_DEFINITION_CODES];

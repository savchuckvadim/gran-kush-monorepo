export const identitySideToPayloadKey = {
    first: "documentFirst",
    second: "documentSecond",
} as const;

export type IdentitySide = keyof typeof identitySideToPayloadKey;
export type IdentityPayloadKey = (typeof identitySideToPayloadKey)[IdentitySide];

export function getIdentityPayloadKey(side: IdentitySide): IdentityPayloadKey {
    return identitySideToPayloadKey[side];
}


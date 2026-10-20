export const taxRateKeys = {
    all: ["tax-rates"] as const,
    list: (includeArchived: boolean) => [...taxRateKeys.all, { includeArchived }] as const,
};

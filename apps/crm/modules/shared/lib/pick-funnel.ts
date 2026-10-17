/** The funnel chosen in the address, else the default one, else the first. */
export const pickFunnel = <T extends { id: string; isDefault: boolean }>(
    funnels: readonly T[],
    funnelId?: string | null
): T | undefined =>
    funnels.find((funnel) => funnel.id === funnelId) ??
    funnels.find((funnel) => funnel.isDefault) ??
    funnels[0];

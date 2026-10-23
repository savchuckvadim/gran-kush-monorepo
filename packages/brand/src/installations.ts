import installations from "./installations.json";
import type { BrandCode, BrandDomains } from "./types";

/**
 * Where an installation lives. The JSON is the one source for the brand configs, the compose
 * renderer (`infra/dokploy/render.mjs`) and the CI matrix, which read it with plain node.
 */
export interface Installation {
    domain: string;
    cabinetSubdomain: string;
    /** `false` — the domain is not live yet: CI builds no images for it and deploys nothing. */
    released: boolean;
    /** Deploy goes in this order and stops at the first red `/health`: studios first, clubs last. */
    deployOrder: number;
    /** This installation's compose also runs what the whole server needs once (disk janitor). */
    serverServices: boolean;
}

export const INSTALLATIONS: Record<BrandCode, Installation> = installations;

export const domainsOf = (code: BrandCode): BrandDomains => {
    const { domain, cabinetSubdomain } = INSTALLATIONS[code];
    return {
        site: domain,
        crm: `crm.${domain}`,
        cabinet: `${cabinetSubdomain}.${domain}`,
        api: `api.${domain}`,
    };
};

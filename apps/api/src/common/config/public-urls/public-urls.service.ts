import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Where the API points outside itself: its own public address and the two frontends. */
export const PUBLIC_URL_KEYS = [
    "API_PUBLIC_URL",
    "CRM_FRONTEND_URL",
    "MEMBER_FRONTEND_URL",
] as const;
export type PublicUrlKey = (typeof PUBLIC_URL_KEYS)[number];

/**
 * Local development defaults: the API on 3000 and the CRM on 5000. The member cabinet is the same
 * CRM app on a `club.` host, so locally it is reached at `club.localhost:5000` (or `club.lvh.me` when
 * cookies must cross subdomains).
 */
const LOCAL_DEFAULTS: Record<PublicUrlKey, string> = {
    API_PUBLIC_URL: "http://localhost:3000",
    CRM_FRONTEND_URL: "http://localhost:5000",
    MEMBER_FRONTEND_URL: "http://club.localhost:5000",
};

/**
 * Public addresses from the environment, without a trailing slash. In production each one is
 * required: a missing value stops the API at start instead of sending people to localhost.
 */
@Injectable()
export class PublicUrlsService {
    readonly api: string;
    readonly crm: string;
    readonly cabinet: string;

    constructor(config: ConfigService) {
        const production = config.get<string>("NODE_ENV") === "production";
        const read = (key: PublicUrlKey): string => {
            const value = config.get<string>(key)?.trim();
            if (value) return value.replace(/\/+$/, "");
            if (production) throw new Error(`${key} must be set in production`);
            return LOCAL_DEFAULTS[key];
        };
        this.api = read("API_PUBLIC_URL");
        this.crm = read("CRM_FRONTEND_URL");
        this.cabinet = read("MEMBER_FRONTEND_URL");
    }
}

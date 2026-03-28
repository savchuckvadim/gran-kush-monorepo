/**
 * Persist EntityList UI prefs (view mode, column visibility) in a first-party cookie.
 */

const COOKIE_PREFIX = "gk_crm_el_";
const MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

function toCookieName(rawKey: string): string {
    const safe = rawKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${COOKIE_PREFIX}${safe}`;
}

export function readJsonArrayFromCookie(name: string, fallback: string[]): string[] {
    if (typeof document === "undefined") return fallback;
    const cname = toCookieName(name);
    const parts = `; ${document.cookie}`.split(`; ${cname}=`);
    if (parts.length < 2) return fallback;
    const value = parts.pop()?.split(";").shift();
    if (!value) return fallback;
    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        if (!Array.isArray(parsed)) return fallback;
        return parsed.filter((x) => typeof x === "string") as string[];
    } catch {
        return fallback;
    }
}

export function writeJsonArrayToCookie(name: string, value: string[]): void {
    if (typeof document === "undefined") return;
    const cname = toCookieName(name);
    const encoded = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${cname}=${encoded};path=/;max-age=${MAX_AGE_SEC};SameSite=Lax`;
}

export function readBooleanFromCookie(name: string, fallback: boolean): boolean {
    const raw = readJsonArrayFromCookie(name, [fallback ? "1" : "0"])[0];
    return raw === "1" || raw === "true";
}

export function writeBooleanToCookie(name: string, value: boolean): void {
    writeJsonArrayToCookie(name, [value ? "1" : "0"]);
}

export function readJsonFromCookie<T>(name: string, fallback: T): T {
    if (typeof document === "undefined") return fallback;
    const cname = toCookieName(name);
    const parts = `; ${document.cookie}`.split(`; ${cname}=`);
    if (parts.length < 2) return fallback;
    const value = parts.pop()?.split(";").shift();
    if (!value) return fallback;
    try {
        const decoded = decodeURIComponent(value);
        return JSON.parse(decoded) as T;
    } catch {
        return fallback;
    }
}

export function writeJsonToCookie(name: string, value: unknown): void {
    if (typeof document === "undefined") return;
    const cname = toCookieName(name);
    const encoded = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${cname}=${encoded};path=/;max-age=${MAX_AGE_SEC};SameSite=Lax`;
}

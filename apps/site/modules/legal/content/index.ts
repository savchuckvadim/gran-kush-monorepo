import type { Locale } from "@/modules/shared/config/locales";
import { BRAND } from "@/modules/shared/config/site";

import { LEGAL_VERSION } from "../provider";
import type { LegalContent } from "../types";

import { en } from "./en";
import { es } from "./es";
import { ru } from "./ru";

/** The texts are written for PafPaf at paf-paf.app; any other installation gets its own name and domain. */
const WRITTEN_FOR = { name: "PafPaf", domain: "paf-paf.app" } as const;

const forInstallation = <T>(value: T): T => {
    if (typeof value === "string") {
        return value
            .replaceAll(WRITTEN_FOR.name, BRAND.name)
            .replaceAll(WRITTEN_FOR.domain, BRAND.domains.site) as T;
    }
    if (Array.isArray(value)) return value.map(forInstallation) as T;
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, forInstallation(item)])
        ) as T;
    }
    return value;
};

export const LEGAL_CONTENT: Record<Locale, LegalContent> = {
    es: forInstallation(es),
    en: forInstallation(en),
    ru: forInstallation(ru),
};

export const formatLegalVersion = (locale: Locale) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${LEGAL_VERSION}T12:00:00Z`)
    );

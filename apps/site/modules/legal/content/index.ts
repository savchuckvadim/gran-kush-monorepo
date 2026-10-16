import type { Locale } from "@/modules/shared/config/locales";

import { LEGAL_VERSION } from "../provider";
import type { LegalContent } from "../types";

import { en } from "./en";
import { es } from "./es";
import { ru } from "./ru";

export const LEGAL_CONTENT: Record<Locale, LegalContent> = { es, en, ru };

export const formatLegalVersion = (locale: Locale) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${LEGAL_VERSION}T12:00:00Z`)
    );

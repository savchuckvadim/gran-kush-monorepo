import type { LocalizationConfig } from "payload";

import { DEFAULT_LOCALE, LOCALE_LABELS, LOCALES } from "../modules/shared/config/locales";

export const localization: LocalizationConfig = {
    locales: LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] })),
    defaultLocale: DEFAULT_LOCALE,
    fallback: true,
};

import { type Locale, locales } from "@/i18n";

/** Language of the emails the API sends: the CRM locale when it is one of the supported ones. */
export const toMailLocale = (value: string): Locale | undefined =>
    locales.find((locale) => locale === value);

/** A token from an email link stops working once used or after it expires. */
export const isDeadTokenStatus = (status: number): boolean => status === 404 || status === 401;

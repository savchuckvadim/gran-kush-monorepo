import { type Locale, locales } from "@/i18n";

/** Same rule as the API DTOs: RegisterPortalDto.password and ResetPasswordDto.newPassword. */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
export const PASSWORD_MIN_LENGTH = 8;

/** Language of the emails the API sends: the CRM locale when it is one of the supported ones. */
export const toMailLocale = (value: string): Locale | undefined =>
    locales.find((locale) => locale === value);

/** A token from an email link stops working once used or after it expires. */
export const isDeadTokenStatus = (status: number): boolean => status === 404 || status === 401;

/**
 * Type-safe translation keys
 * Auto-completion support for translation keys
 */

// Common translation keys
export type CommonTranslationKey =
    | "loading"
    | "error"
    | "success"
    | "cancel"
    | "save"
    | "delete"
    | "edit"
    | "submit"
    | "back"
    | "next"
    | "required"
    | "companyName"
    | "companyTagline"
    | "allRightsReserved";

// Navigation translation keys
export type NavigationTranslationKey =
    | "home"
    | "about"
    | "contacts"
    | "login"
    | "register"
    | "profile"
    | "settings"
    | "logout"
    | "privacy"
    | "terms"
    | "navigationSection"
    | "accountSection"
    | "legalSection";

type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest]
    ? Rest
    : never;

type BaseTranslationFn = (key: string, ...args: readonly unknown[]) => string;

// Helper type for typed translation function
export type TypedTranslation<T extends string, Fn extends BaseTranslationFn> = (
    key: T,
    ...args: Tail<Parameters<Fn>>
) => string;

// Helper function to create typed translation
export function createTypedTranslation<T extends string, Fn extends BaseTranslationFn>(
    translationFn: Fn
): TypedTranslation<T, Fn> {
    return (key, ...args) => translationFn(key, ...args);
}

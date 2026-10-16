import { registerDecorator, ValidationOptions } from "class-validator";

/**
 * Slug клуба стоит в адресе первым сегментом после языка: `club.paf-paf.app/{язык}/{клуб}`.
 * Эти слова заняты самим приложением (страницы входа, ссылки из писем, служебные пути, языки),
 * поэтому клубом называться не могут: иначе `/{язык}/auth` или `/{язык}/me` открывали бы клуб
 * вместо страницы.
 *
 * Список зеркалит `RESERVED_CLUB_SLUGS` в `apps/crm/modules/shared/config/club-routes.ts`; тест
 * `reserved-slugs.spec.ts` сверяет их. Менять только вместе.
 */
export const RESERVED_PORTAL_SLUGS: ReadonlySet<string> = new Set([
    // страницы кабинета и ссылки из писем
    "auth",
    "join",
    "consent",
    "me",
    "m",
    "home",
    "scan",
    "invite",
    "login",
    "register",
    "logout",
    // старые пути кабинета
    "profile",
    "clubs",
    "about-us",
    "contacts",
    "account",
    "settings",
    "docs",
    // служебное и поддомены
    "api",
    "admin",
    "crm",
    "club",
    "www",
    "app",
    "static",
    "public",
    "assets",
    "health",
    // языки интерфейса
    "ru",
    "en",
    "es",
]);

export const isReservedPortalSlug = (slug: string): boolean =>
    RESERVED_PORTAL_SLUGS.has(slug.trim().toLowerCase());

/** `@IsNotReservedPortalSlug()` — slug клуба не из списка занятых приложением слов. */
export const IsNotReservedPortalSlug =
    (options?: ValidationOptions) =>
    (object: object, propertyName: string): void => {
        registerDecorator({
            name: "isNotReservedPortalSlug",
            target: object.constructor,
            propertyName,
            options: {
                message: "This club address is reserved. Choose another one",
                ...options,
            },
            validator: {
                validate: (value: unknown) =>
                    typeof value === "string" && !isReservedPortalSlug(value),
            },
        });
    };

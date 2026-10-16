import type { paths } from "./schema";

/*
 * Части API по префиксу адреса — чтобы клиент одного принципала не вызывал эндпоинты другого.
 * Клиент кабинета видит только `/cabinet/*`, клиент CRM — всё, кроме него: ошибка в пути ловится
 * на этапе типов, а не 401 в рантайме.
 */

/** Только пути, которые начинаются с `Prefix`. */
export type PathsWithPrefix<Prefix extends string> = {
    [K in keyof paths as K extends `${Prefix}${string}` ? K : never]: paths[K];
};

/** Все пути, кроме тех, что начинаются с `Prefix`. */
export type PathsWithoutPrefix<Prefix extends string> = {
    [K in keyof paths as K extends `${Prefix}${string}` ? never : K]: paths[K];
};

/** API кабинета участника. */
export type CabinetPaths = PathsWithPrefix<"/cabinet/">;

/** API сотрудника: CRM, регистрация клуба, публичные страницы. */
export type CrmPaths = PathsWithoutPrefix<"/cabinet/">;

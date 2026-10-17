import { RequestMethod } from "@nestjs/common";
import { INestApplication } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ModulesContainer } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../../src/common/decorators/auth/public.decorator";
import { REQUIRED_PERMISSIONS_KEY } from "../../src/common/decorators/auth/require-permission.decorator";

/** Гварды, которые сами устанавливают, кто вошёл: без одного из них маршрут открыт всем. */
export const SESSION_GUARDS = ["CrmSessionGuard", "CabinetSessionGuard", "PlatformJwtAuthGuard"];

export interface RouteAuth {
    method: string;
    path: string;
    controller: string;
    isPublic: boolean;
    guards: string[];
    permissions: string[];
}

type Metatype = new (...args: never[]) => unknown;

const nameOf = (guard: unknown): string =>
    typeof guard === "function" ? guard.name : ((guard as object)?.constructor?.name ?? "?");

const joinPath = (...parts: (string | undefined)[]): string =>
    `/${parts
        .flatMap((part) => (part ?? "").split("/"))
        .filter(Boolean)
        .join("/")}`;

const metadata = <T>(key: string, target: object | undefined): T | undefined =>
    target ? (Reflect.getMetadata(key, target) as T | undefined) : undefined;

/**
 * Все HTTP-маршруты приложения с тем, что их защищает: `@Public`, гварды класса и метода,
 * права `@RequirePermission`. Читает те же метаданные, что Nest при сборке роутера.
 */
export const collectRouteAuth = (app: INestApplication): RouteAuth[] => {
    const routes: RouteAuth[] = [];
    for (const module of app.get(ModulesContainer).values()) {
        for (const wrapper of module.controllers.values()) {
            const controller = wrapper.metatype as Metatype | null;
            if (!controller) continue;
            const classPaths = [metadata<string | string[]>(PATH_METADATA, controller)].flat();
            const classGuards = metadata<unknown[]>(GUARDS_METADATA, controller) ?? [];
            const classPublic = metadata<boolean>(IS_PUBLIC_KEY, controller) === true;
            const classPermissions = metadata<string[]>(REQUIRED_PERMISSIONS_KEY, controller) ?? [];

            const prototype = controller.prototype as Record<string, unknown>;
            for (const name of Object.getOwnPropertyNames(prototype)) {
                const handler = prototype[name];
                if (name === "constructor" || typeof handler !== "function") continue;
                const requestMethod = metadata<RequestMethod>(METHOD_METADATA, handler);
                const methodPaths = metadata<string | string[]>(PATH_METADATA, handler);
                if (requestMethod === undefined || methodPaths === undefined) continue;

                const guards = [
                    ...classGuards,
                    ...(metadata<unknown[]>(GUARDS_METADATA, handler) ?? []),
                ].map(nameOf);
                const permissions = [
                    ...classPermissions,
                    ...(metadata<string[]>(REQUIRED_PERMISSIONS_KEY, handler) ?? []),
                ];
                for (const classPath of classPaths) {
                    for (const methodPath of [methodPaths].flat()) {
                        routes.push({
                            method: RequestMethod[requestMethod],
                            path: joinPath(classPath, methodPath),
                            controller: controller.name,
                            isPublic:
                                classPublic || metadata<boolean>(IS_PUBLIC_KEY, handler) === true,
                            guards,
                            permissions,
                        });
                    }
                }
            }
        }
    }
    return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
};

/** Нарушения правил защиты маршрута; пустой список — всё объявлено явно и согласованно. */
export const routeAuthViolations = (routes: RouteAuth[]): string[] =>
    routes.flatMap((route) => {
        const label = `${route.method} ${route.path} (${route.controller})`;
        const hasSession = route.guards.some((guard) => SESSION_GUARDS.includes(guard));
        const problems: string[] = [];
        if (!route.isPublic && !hasSession) {
            problems.push(`${label}: neither @Public() nor a session guard`);
        }
        if (route.isPublic && hasSession) {
            problems.push(`${label}: @Public() together with a session guard`);
        }
        if (route.permissions.length > 0 && !route.guards.includes("PermissionGuard")) {
            problems.push(`${label}: @RequirePermission without PermissionGuard (CrmAuth)`);
        }
        return problems;
    });

const describeAccess = (route: RouteAuth): string => {
    if (route.isPublic) return "публичный";
    const chain = route.guards.map((guard) => guard.replace(/Guard$/, "")).join(" → ");
    return chain;
};

/** Матрица «маршрут × защита» для documentation/backend/AUTH_ROUTES.md. */
export const renderRouteMatrix = (routes: RouteAuth[]): string => {
    const lines = [
        "# Маршруты API и их защита",
        "",
        "Сгенерировано тестом `test/route-auth.e2e-spec.ts` (`WRITE_AUTH_MATRIX=1`). Не править руками:",
        "тест падает, если маршрут не объявлен `@Public()` и не стоит под гвардом сессии, или если",
        "`@RequirePermission` стоит без `PermissionGuard`.",
        "",
        `Всего маршрутов: ${routes.length}, публичных: ${routes.filter((r) => r.isPublic).length}.`,
        "",
        "| Метод | Путь | Доступ | Права |",
        "|---|---|---|---|",
        ...routes.map(
            (route) =>
                `| ${route.method} | \`${route.path}\` | ${describeAccess(route)} | ${
                    route.permissions.map((p) => `\`${p}\``).join(", ") || ""
                } |`
        ),
        "",
    ];
    return lines.join("\n");
};

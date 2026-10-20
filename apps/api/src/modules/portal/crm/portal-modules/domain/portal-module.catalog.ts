import { PortalTypeEnum } from "@prisma/client";

/**
 * Подключаемые модули портала (TASK-796). Модуль — раздел продукта, который клуб или студия
 * включает сами: свой экран, свои права и свои маршруты API под `CrmAuth({ module })`. Базовые
 * разделы (участники, каталог, заказы) модулями не являются и включены всегда.
 *
 * Новый модуль: строка здесь, `CrmAuth({ module })` на его контроллерах, при необходимости — хук
 * включения через `PortalModuleRegistry` (пресеты, первичные данные).
 */
export const PORTAL_MODULE_CODES = ["finance"] as const;
export type PortalModuleCode = (typeof PORTAL_MODULE_CODES)[number];

export interface PortalModuleDefinition {
    code: PortalModuleCode;
    /** Каким типам порталов модуль доступен вообще */
    availableFor: readonly PortalTypeEnum[];
}

const ALL_PORTAL_TYPES = Object.values(PortalTypeEnum);

export const PORTAL_MODULES: Record<PortalModuleCode, PortalModuleDefinition> = {
    // учёт доходов и расходов, налоги и отчётность: клубы, тату и бьюти — asociación, autónomo, SL
    finance: { code: "finance", availableFor: ALL_PORTAL_TYPES },
};

export const isPortalModuleCode = (code: string): code is PortalModuleCode =>
    (PORTAL_MODULE_CODES as readonly string[]).includes(code);

export const isModuleAvailable = (code: PortalModuleCode, type: PortalTypeEnum): boolean =>
    PORTAL_MODULES[code].availableFor.includes(type);

/** Код отказа 403, когда маршрут модуля вызывают при выключенном модуле */
export const MODULE_DISABLED = "module_disabled";

import { accessRealtimeRules } from "@/modules/entities/access/realtime";
import { cabinetClubRealtimeRules } from "@/modules/entities/cabinet-club/realtime";
import { cabinetOrderRealtimeRules } from "@/modules/entities/cabinet-order/realtime";
import { cabinetShopRealtimeRules } from "@/modules/entities/cabinet-shop/realtime";
import { employeeRealtimeRules } from "@/modules/entities/employee/realtime";
import { financeRealtimeRules } from "@/modules/entities/finance/realtime";
import { memberRealtimeRules } from "@/modules/entities/member/realtime";
import { membershipRealtimeRules } from "@/modules/entities/membership/realtime";
import { notificationRealtimeRules } from "@/modules/entities/notification/realtime";
import { orderRealtimeRules } from "@/modules/entities/order/realtime";
import { portalModuleRealtimeRules } from "@/modules/entities/portal-modules/realtime";
import { presenceRealtimeRules } from "@/modules/entities/presence/realtime";
import { productRealtimeRules } from "@/modules/entities/product/realtime";
import type { RealtimeRule } from "@/modules/shared/realtime";

/*
 * Правила берутся из файлов `realtime.ts`, а не из индексов сущностей: индекс тянет хуки, а
 * часть хуков — процессы, и при старте получился бы цикл импортов.
 *
 * Что обновляет каждое приложение по событиям. Новое событие или новый экран — правило в
 * сущности (`entities/<x>/realtime.ts`) и строка здесь.
 */

export const CRM_REALTIME_RULES: readonly RealtimeRule[] = [
    ...orderRealtimeRules,
    ...memberRealtimeRules,
    ...productRealtimeRules,
    ...presenceRealtimeRules,
    ...employeeRealtimeRules,
    ...accessRealtimeRules,
    ...portalModuleRealtimeRules,
    ...financeRealtimeRules,
    ...notificationRealtimeRules,
];

export const CABINET_REALTIME_RULES: readonly RealtimeRule[] = [
    ...cabinetOrderRealtimeRules,
    ...cabinetShopRealtimeRules,
    ...cabinetClubRealtimeRules,
    ...membershipRealtimeRules,
    ...notificationRealtimeRules,
];

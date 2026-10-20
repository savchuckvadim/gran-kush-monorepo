"use client";

import { FinanceModuleGate } from "@/modules/features/finance-setup";

import { FinanceDashboard } from "./finance-dashboard";
import { FinanceSetupStep } from "./finance-setup-step";

/**
 * Раздел «Финансы»: модуль не подключён — предложение подключить; подключён, но организация не
 * описана — первый шаг настройки (пресет по типу клуба уже подставлен); дальше — сам учёт.
 */
export function FinancePage() {
    return (
        <FinanceModuleGate>
            {(profile) =>
                profile.configured ? (
                    <FinanceDashboard profile={profile} />
                ) : (
                    <FinanceSetupStep profile={profile} />
                )
            }
        </FinanceModuleGate>
    );
}

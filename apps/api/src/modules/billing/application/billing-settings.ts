import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const DAY_MS = 24 * 60 * 60 * 1000;

const positiveInt = (raw: string | undefined, fallback: number): number => {
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const addDays = (from: Date, days: number): Date => new Date(from.getTime() + days * DAY_MS);

/** Добавляет месяцы календарно: 31 января + 1 месяц = последний день февраля. */
export const addMonths = (from: Date, months: number): Date => {
    const result = new Date(from);
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
};

/** Настройки биллинга из окружения. */
@Injectable()
export class BillingSettings {
    /** Бесплатный период нового клуба. Решение владельца 2026-10-11: год. */
    readonly trialDays: number;
    /** Сколько CRM ещё работает после неоплаты или конца бесплатного периода. */
    readonly graceDays: number;
    /** База CRM для адресов возврата из оплаты. */
    readonly crmUrl: string;

    constructor(config: ConfigService) {
        this.trialDays = positiveInt(config.get<string>("BILLING_TRIAL_DAYS"), 365);
        this.graceDays = positiveInt(config.get<string>("BILLING_GRACE_DAYS"), 7);
        this.crmUrl = (config.get<string>("CRM_FRONTEND_URL") ?? "").replace(/\/+$/, "");
    }

    trialEndFrom(start: Date): Date {
        return addDays(start, this.trialDays);
    }

    graceEndFrom(start: Date): Date {
        return addDays(start, this.graceDays);
    }
}

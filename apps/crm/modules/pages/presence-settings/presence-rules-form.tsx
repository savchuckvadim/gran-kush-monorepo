"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button, Input } from "@workspace/ui";

import type { PresenceSettings } from "@/modules/entities/presence";
import { SettingRow } from "@/modules/shared/ui/SettingRow";
import { TimezonePicker } from "@/modules/shared/ui/TimezonePicker";

/** Совпадает с правилом API: целое число часов, от 1 до 48. */
const MAX_HOURS = { min: 1, max: 48 } as const;

interface PresenceRulesFormProps {
    settings: PresenceSettings;
    disabled: boolean;
    onSave: (settings: PresenceSettings) => void;
}

const parseHours = (raw: string): number | null | "invalid" => {
    if (raw.trim() === "") return null;
    const hours = Number(raw);
    return Number.isInteger(hours) && hours >= MAX_HOURS.min && hours <= MAX_HOURS.max
        ? hours
        : "invalid";
};

/**
 * Правила одним сохранением: пояс и время авто-выхода имеют смысл только вместе, а частичное
 * сохранение по полю оставило бы клуб с «03:00» в чужом поясе.
 */
export function PresenceRulesForm({ settings, disabled, onSave }: PresenceRulesFormProps) {
    const t = useTranslations("crm.presenceSettings");
    const locale = useLocale();
    const [timezone, setTimezone] = useState(settings.timezone);
    const [autoExitTime, setAutoExitTime] = useState(settings.autoExitTime);
    const [hours, setHours] = useState(
        settings.maxSessionHours === null ? "" : String(settings.maxSessionHours)
    );

    const maxSessionHours = parseHours(hours);
    const invalid = maxSessionHours === "invalid" || autoExitTime === "";
    const changed =
        timezone !== settings.timezone ||
        autoExitTime !== settings.autoExitTime ||
        maxSessionHours !== settings.maxSessionHours;

    const clubTime = new Date().toLocaleTimeString(locale, {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (maxSessionHours === "invalid" || autoExitTime === "") return;
                onSave({ timezone, autoExitTime, maxSessionHours });
            }}
        >
            <ul className="divide-y">
                <SettingRow
                    htmlFor="presence-timezone"
                    title={t("timezone.label")}
                    description={t("timezone.description", { time: clubTime })}
                >
                    <TimezonePicker
                        id="presence-timezone"
                        value={timezone}
                        onChange={setTimezone}
                        disabled={disabled}
                        labels={{ search: t("timezone.search"), empty: t("timezone.empty") }}
                    />
                </SettingRow>
                <SettingRow
                    htmlFor="presence-auto-exit"
                    title={t("autoExit.label")}
                    description={t("autoExit.description")}
                >
                    <Input
                        id="presence-auto-exit"
                        type="time"
                        step={60}
                        required
                        value={autoExitTime}
                        disabled={disabled}
                        onChange={(event) => setAutoExitTime(event.target.value)}
                        className="w-32"
                    />
                </SettingRow>
                <SettingRow
                    htmlFor="presence-cap"
                    title={t("cap.label")}
                    description={t("cap.description")}
                    error={maxSessionHours === "invalid" ? t("cap.invalid") : undefined}
                >
                    <Input
                        id="presence-cap"
                        type="number"
                        inputMode="numeric"
                        min={MAX_HOURS.min}
                        max={MAX_HOURS.max}
                        step={1}
                        value={hours}
                        disabled={disabled}
                        onChange={(event) => setHours(event.target.value)}
                        placeholder={t("cap.placeholder")}
                        aria-invalid={maxSessionHours === "invalid"}
                        className="w-40"
                    />
                </SettingRow>
            </ul>
            <div className="flex justify-end border-t px-4 py-3">
                <Button type="submit" size="sm" disabled={disabled || invalid || !changed}>
                    {t("save")}
                </Button>
            </div>
        </form>
    );
}

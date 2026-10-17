"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, FieldInput } from "@workspace/ui";

import { useCreateMeasurementUnit } from "@/modules/entities/measurement-unit";

/** Предел длины кода единицы в API. */
const UNIT_CODE_MAX_LENGTH = 32;
const FALLBACK_UNIT_CODE = "UNIT";

/** Код из названия, если его не ввели: латиница и цифры через подчёркивание, заглавными. */
const toUnitCode = (name: string): string =>
    name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || FALLBACK_UNIT_CODE;

/** Своя единица измерения клуба. */
export function CreateMeasurementUnitForm({ onCreated }: { onCreated: () => void }) {
    const t = useTranslations("crm.sections.settings.measurementUnits");
    const create = useCreateMeasurementUnit();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        create.mutate(
            {
                name: trimmed,
                code: (code.trim() || toUnitCode(trimmed)).slice(0, UNIT_CODE_MAX_LENGTH),
                isCustom: true,
            },
            {
                onSuccess: () => {
                    toast.success(t("created"));
                    onCreated();
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FieldInput
                label={t("fields.name")}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <FieldInput
                label={t("fields.code")}
                placeholder={t("fields.codePlaceholder")}
                value={code}
                onChange={(event) => setCode(event.target.value)}
            />
            {create.isError ? (
                <p role="alert" className="text-sm text-destructive">
                    {t("createError")}
                </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={create.isPending || !name.trim()}>
                {create.isPending ? t("creating") : t("submit")}
            </Button>
        </form>
    );
}

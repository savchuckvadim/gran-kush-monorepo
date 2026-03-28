"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import { useCreateMeasurementUnit, useMeasurementUnits } from "@/modules/entities/measurement-unit";

function toUnitCode(name: string): string {
    return (
        name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") || "UNIT"
    );
}

export function MeasurementUnitManagementWidget() {
    const t = useTranslations("crm.sections.settings.measurementUnits");
    const { data: units, isLoading } = useMeasurementUnits();
    const createUnitMutation = useCreateMeasurementUnit();

    const [name, setName] = useState("");
    const [code, setCode] = useState("");

    const sortedUnits = useMemo(
        () => [...(units ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [units]
    );

    const handleCreate = async () => {
        const normalizedName = name.trim();
        if (!normalizedName) return;

        try {
            await createUnitMutation.mutateAsync({
                name: normalizedName,
                code: (code.trim() || toUnitCode(normalizedName)).slice(0, 32),
                isCustom: true,
            });
            setName("");
            setCode("");
        } catch {
            // handled in mutation state
        }
    };

    return (
        <Card className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">{t("title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="space-y-4">
                <FieldInput
                    label={t("fields.name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <FieldInput
                    label={t("fields.code")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("fields.codePlaceholder")}
                />

                {createUnitMutation.isError && (
                    <p className="text-sm text-destructive">{t("createError")}</p>
                )}

                <Button
                    onClick={handleCreate}
                    disabled={createUnitMutation.isPending || !name.trim()}
                    className="w-full sm:w-auto"
                >
                    {createUnitMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("creating")}
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("create")}
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-6 rounded-md border bg-muted/20 p-4">
                <h3 className="mb-2 text-sm font-medium">{t("existing")}</h3>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loading")}
                    </div>
                ) : sortedUnits.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        {sortedUnits.map((unit) => (
                            <li
                                key={unit.id}
                                className="flex items-center justify-between rounded border bg-background px-2 py-1.5"
                            >
                                <span>{unit.name}</span>
                                <span className="text-xs text-muted-foreground">{unit.code}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                )}
            </div>
        </Card>
    );
}

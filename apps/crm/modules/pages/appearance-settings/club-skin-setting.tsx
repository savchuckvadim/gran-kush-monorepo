"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, FieldSelect } from "@workspace/ui";

import { usePortalInfo, usePortalRole, useUpdatePortalAppearance } from "@/modules/entities/portal";
import { useSkinText } from "@/modules/features/skin-picker/use-skin-text";
import { DEFAULT_SKIN, normalizeSkinId, SKINS } from "@/modules/shared/config/skins";

/**
 * Тема клуба по умолчанию: её видят сотрудники в CRM и участники в кабинете, пока не выбрали
 * свою. Пустое значение — тема PafPaf. Меняет администратор, остальные видят выбранную.
 */
export function ClubSkinSetting() {
    const text = useSkinText();
    const { isAdmin } = usePortalRole();
    const info = usePortalInfo();
    const update = useUpdatePortalAppearance();
    const saved = normalizeSkinId(info.data?.defaultSkin) ?? "";
    const [value, setValue] = useState<string | null>(null);
    const selected = value ?? saved;

    const options = [
        { value: "", label: text.t("clubSkin.none") },
        ...SKINS.filter((skin) => skin.id !== DEFAULT_SKIN).map((skin) => ({
            value: skin.id,
            label: text.name(skin.id),
        })),
    ];

    return (
        <Card padding="sm" className="max-w-3xl space-y-3 px-4 py-4">
            <div>
                <h2 className="font-medium">{text.t("clubSkin.title")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {isAdmin ? text.t("clubSkin.description") : text.t("clubSkin.adminOnly")}
                </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <div className="w-64">
                    <FieldSelect
                        options={options}
                        value={selected}
                        onValueChange={setValue}
                        disabled={!isAdmin || info.isLoading || update.isPending}
                    />
                </div>
                {isAdmin && (
                    <Button
                        size="sm"
                        disabled={selected === saved || update.isPending}
                        onClick={() =>
                            update.mutate(selected || null, { onSuccess: () => setValue(null) })
                        }
                    >
                        {text.t("clubSkin.save")}
                    </Button>
                )}
            </div>
            {update.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(update.error)}
                </p>
            )}
        </Card>
    );
}

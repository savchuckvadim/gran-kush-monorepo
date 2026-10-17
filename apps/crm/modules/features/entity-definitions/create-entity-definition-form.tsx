"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { useCreateEntityDefinition } from "@/modules/entities/entity-settings";

/** Новый смарт-процесс: код (snake_case, его не меняют) и название. */
export function CreateEntityDefinitionForm({ onCreated }: { onCreated: () => void }) {
    const t = useTranslations("crm.entitiesSettings.create");
    const create = useCreateEntityDefinition();
    const [code, setCode] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        create.mutate(
            { code: code.trim(), name: name.trim() },
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
                label={t("code")}
                placeholder={t("codePlaceholder")}
                helperText={t("codeHint")}
                autoComplete="off"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
            />
            <FieldInput
                label={t("name")}
                placeholder={t("namePlaceholder")}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            {create.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(create.error)}
                </p>
            ) : null}
            <Button
                type="submit"
                className="w-full"
                disabled={!code.trim() || !name.trim() || create.isPending}
            >
                {create.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}

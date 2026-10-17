"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, FieldInput } from "@workspace/ui";

import { type PortalRole, useCreatePortalRole, useRoleErrorText } from "@/modules/entities/access";

/** Своя роль: только название; права роль получает на экране ролей — по умолчанию никаких. */
export function CreateRoleForm({ onCreated }: { onCreated: (role: PortalRole) => void }) {
    const t = useTranslations("crm.access.rolesPage");
    const create = useCreatePortalRole();
    const errorText = useRoleErrorText();
    const [name, setName] = useState("");

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        create.mutate(
            { name: name.trim(), permissions: [] },
            {
                onSuccess: (role) => {
                    toast.success(t("created"));
                    onCreated(role);
                },
            }
        );
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <FieldInput
                label={t("nameLabel")}
                placeholder={t("namePlaceholder")}
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            {create.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {errorText(create.error)}
                </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={!name.trim() || create.isPending}>
                {create.isPending ? t("saving") : t("create")}
            </Button>
        </form>
    );
}

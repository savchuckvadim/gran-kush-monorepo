"use client";

import { useState } from "react";
import NextLink from "next/link";

import { Loader2, Plus, Settings2 } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import {
    useCreateEntityDefinition,
    useEntityDefinitions,
} from "@/modules/entities/entity-settings";
import { ROUTES } from "@/modules/shared/config/routes";
import { getApiErrorMessage } from "@/modules/shared";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const SYSTEM_ENTITIES = [
    { code: "member", name: "Клиенты" },
    { code: "order", name: "Заказы" },
];

export default function EntitiesSettingsPage() {
    const toAppPath = useLocalizedLink();
    const { data: definitions = [], isLoading } = useEntityDefinitions();
    const createMutation = useCreateEntityDefinition();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const custom = definitions
        .map((definition) => ({
            code: typeof definition.code === "string" ? definition.code : "",
            name: typeof definition.name === "string" ? definition.name : "",
            isSystem: definition.isSystem === true,
        }))
        .filter((definition) => definition.code);

    async function handleCreate() {
        setError(null);
        try {
            await createMutation.mutateAsync({ code: code.trim(), name: name.trim() });
            setCode("");
            setName("");
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    }

    const entities = custom.length > 0 ? custom : SYSTEM_ENTITIES.map((e) => ({ ...e, isSystem: true }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Смарт-процессы и сущности</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Настройка полей, форм и стадий для клиентов, заказов и кастомных сущностей.
                </p>
            </div>

            <Card className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="divide-y">
                        {entities.map((entity) => (
                            <div
                                key={entity.code}
                                className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                                <div>
                                    <p className="font-medium">{entity.name || entity.code}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {entity.code}
                                        {entity.isSystem ? " · системная" : ""}
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <NextLink
                                        href={toAppPath(
                                            `${ROUTES.CRM_SETTINGS_ENTITIES}/${entity.code}`
                                        )}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Settings2 className="h-4 w-4" /> Настроить
                                        </span>
                                    </NextLink>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Создать смарт-процесс</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <FieldInput
                        label="Код (snake_case)"
                        placeholder="vendor"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <FieldInput
                        label="Название"
                        placeholder="Поставщики"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
                <Button
                    className="mt-4"
                    onClick={handleCreate}
                    disabled={!code.trim() || !name.trim() || createMutation.isPending}
                >
                    <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {createMutation.isPending ? "Создание…" : "Создать"}
                    </span>
                </Button>
            </Card>
        </div>
    );
}

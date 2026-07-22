"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { Copy, Loader2, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, FieldInput, QrCodeDisplay } from "@workspace/ui";

import {
    useCreateRegistrationLink,
    useRegistrationLinks,
    useUpdateRegistrationLink,
    type RegistrationLink,
} from "@/modules/entities/registration-links";
import { getApiErrorMessage } from "@/modules/shared";

type LinkKind = "public_link" | "kiosk";

export function RegistrationLinksSettingsPage() {
    const locale = useLocale();
    const { data: links = [], isLoading } = useRegistrationLinks();
    const createMutation = useCreateRegistrationLink();
    const updateMutation = useUpdateRegistrationLink();

    const [name, setName] = useState("");
    const [kind, setKind] = useState<LinkKind>("public_link");
    const [maxUses, setMaxUses] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [qrToken, setQrToken] = useState<string | null>(null);

    function joinUrl(token: string): string {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/${locale}/join/${token}`;
    }

    async function handleCreate() {
        setError(null);
        try {
            await createMutation.mutateAsync({
                name: name.trim(),
                kind,
                maxUses: maxUses.trim() ? Number.parseInt(maxUses, 10) : undefined,
            });
            setName("");
            setMaxUses("");
            toast.success("Ссылка создана");
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    }

    function handleCopy(token: string) {
        void navigator.clipboard.writeText(joinUrl(token));
        toast.success("Ссылка скопирована");
    }

    function toggleActive(link: RegistrationLink) {
        updateMutation.mutate(
            { id: link.id, body: { isActive: !link.isActive } },
            { onError: (e) => toast.error(e.message) }
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Ссылки-формы регистрации</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Публичные ссылки и QR-коды для регистрации клиентов (в т.ч. режим планшета).
                </p>
            </div>

            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Новая ссылка</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    <FieldInput
                        label="Название"
                        placeholder="Стойка на входе"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Тип</label>
                        <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={kind}
                            onChange={(e) => setKind(e.target.value as LinkKind)}
                        >
                            <option value="public_link">Публичная ссылка</option>
                            <option value="kiosk">Планшет (kiosk)</option>
                        </select>
                    </div>
                    <FieldInput
                        label="Лимит использований"
                        type="number"
                        placeholder="без лимита"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                    />
                </div>
                {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
                <Button
                    className="mt-4"
                    onClick={handleCreate}
                    disabled={!name.trim() || createMutation.isPending}
                >
                    <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {createMutation.isPending ? "Создание…" : "Создать"}
                    </span>
                </Button>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : links.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Ссылок нет</p>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {links.map((link) => (
                        <Card key={link.id} className="p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium">{link.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {link.kind} · использований: {link.usesCount}
                                        {link.maxUses ? ` / ${link.maxUses}` : ""}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs ${
                                        link.isActive
                                            ? "bg-green-500/10 text-green-700"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {link.isActive ? "активна" : "выключена"}
                                </span>
                            </div>

                            <p className="mt-2 break-all rounded bg-muted/40 p-2 text-xs">
                                {joinUrl(link.token)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(link.token)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        <Copy className="h-3 w-3" /> Копировать
                                    </span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setQrToken((prev) =>
                                            prev === link.token ? null : link.token
                                        )
                                    }
                                >
                                    <span className="inline-flex items-center gap-1">
                                        <QrCode className="h-3 w-3" /> QR
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleActive(link)}
                                >
                                    {link.isActive ? "Выключить" : "Включить"}
                                </Button>
                            </div>

                            {qrToken === link.token ? (
                                <div className="mt-3 flex justify-center rounded-md border bg-white p-3">
                                    <QrCodeDisplay value={joinUrl(link.token)} size={180} />
                                </div>
                            ) : null}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

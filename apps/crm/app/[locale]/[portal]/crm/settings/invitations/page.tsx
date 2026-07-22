"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, FieldInput } from "@workspace/ui";

import {
    useCreateInvitation,
    useInvitations,
    useRevokeInvitation,
} from "@/modules/entities/invitations";
import { getApiErrorMessage } from "@/modules/shared";

type EmployeeRole = "portal_owner" | "admin" | "manager" | "employee";

const ROLES: EmployeeRole[] = ["admin", "manager", "employee"];

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700",
    accepted: "bg-green-500/10 text-green-700",
    revoked: "bg-muted text-muted-foreground",
    expired: "bg-red-500/10 text-red-700",
};

export default function InvitationsPage() {
    const locale = useLocale();
    const { data: invitations = [], isLoading } = useInvitations();
    const createMutation = useCreateInvitation();
    const revokeMutation = useRevokeInvitation();

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<EmployeeRole>("employee");
    const [error, setError] = useState<string | null>(null);

    function inviteUrl(token: string): string {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/${locale}/auth/invite/${token}`;
    }

    async function handleCreate() {
        setError(null);
        try {
            await createMutation.mutateAsync({ email: email.trim(), role });
            setEmail("");
            toast.success("Приглашение создано");
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    }

    function handleCopy(token: string) {
        void navigator.clipboard.writeText(inviteUrl(token));
        toast.success("Ссылка скопирована");
    }

    function handleRevoke(id: string) {
        if (!confirm("Отозвать приглашение?")) return;
        revokeMutation.mutate(id, {
            onSuccess: () => toast.success("Приглашение отозвано"),
            onError: (e) => toast.error(e.message),
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Приглашения сотрудников</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Отправьте ссылку-приглашение, чтобы сотрудник присоединился к порталу.
                </p>
            </div>

            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Новое приглашение</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    <FieldInput
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Роль</label>
                        <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={role}
                            onChange={(e) => setRole(e.target.value as EmployeeRole)}
                        >
                            {ROLES.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={handleCreate}
                            disabled={!email.trim() || createMutation.isPending}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                {createMutation.isPending ? "Создание…" : "Пригласить"}
                            </span>
                        </Button>
                    </div>
                </div>
                {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            </Card>

            <Card className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : invitations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Приглашений нет
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                    <th className="px-3 py-2">Email</th>
                                    <th className="px-3 py-2">Роль</th>
                                    <th className="px-3 py-2">Статус</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map((invitation) => (
                                    <tr key={invitation.id} className="border-b last:border-b-0">
                                        <td className="px-3 py-2 font-medium">{invitation.email}</td>
                                        <td className="px-3 py-2">{invitation.role}</td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${
                                                    STATUS_STYLES[invitation.status] ??
                                                    "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {invitation.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end gap-1">
                                                {invitation.status === "pending" ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() =>
                                                                handleCopy(invitation.token)
                                                            }
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                <Copy className="h-3 w-3" /> Ссылка
                                                            </span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive"
                                                            onClick={() =>
                                                                handleRevoke(invitation.id)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

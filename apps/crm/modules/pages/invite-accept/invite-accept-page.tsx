"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import { acceptInvitation, getPublicInvitation } from "@/modules/entities/invitations";
import { getApiErrorMessage } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";

export function InviteAcceptPage({ token }: { token: string }) {
    const router = useRouter();
    const locale = useLocale();

    const infoQuery = useQuery({
        queryKey: ["public-invitation", token],
        queryFn: () => getPublicInvitation(token),
    });

    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const acceptMutation = useMutation({
        mutationFn: () =>
            acceptInvitation(token, {
                password: password || undefined,
                fields: firstName.trim() ? { first_name: firstName.trim() } : undefined,
            }),
        onSuccess: (_data, _vars) => {
            const slug = infoQuery.data?.portalSlug;
            router.push(slug ? `/${locale}/${slug}/crm` : `/${locale}${ROUTES.LOGIN}`);
        },
        onError: (e) => setError(getApiErrorMessage(e)),
    });

    if (infoQuery.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (infoQuery.isError || !infoQuery.data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="max-w-md p-6 text-center">
                    <p className="text-sm text-destructive">
                        Приглашение недействительно или истекло.
                    </p>
                </Card>
            </div>
        );
    }

    const info = infoQuery.data;

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-md p-6">
                <h1 className="text-xl font-semibold">Приглашение в {info.portalDisplayName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {info.email} · роль {info.role}
                </p>

                <div className="mt-4 space-y-3">
                    {!info.accountExists ? (
                        <>
                            <FieldInput
                                label="Имя"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <FieldInput
                                label="Пароль"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            У вас уже есть аккаунт — просто подтвердите присоединение.
                        </p>
                    )}

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <Button
                        className="w-full"
                        onClick={() => {
                            setError(null);
                            acceptMutation.mutate();
                        }}
                        disabled={
                            acceptMutation.isPending ||
                            (!info.accountExists && password.length === 0)
                        }
                    >
                        {acceptMutation.isPending ? "Принятие…" : "Принять приглашение"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

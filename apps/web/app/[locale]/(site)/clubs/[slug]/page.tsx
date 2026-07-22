"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Star } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import {
    DynamicFormFields,
    toSubmitPayload,
    validateDynamicValues,
    type FieldErrors,
    type FormSchemaField,
} from "@workspace/dynamic-forms";
import { Button } from "@workspace/ui";

import { $api } from "@/modules/shared/api";

type PublicPortal = {
    id: string;
    slug: string;
    displayName: string;
    publicDescription?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    averageRating: number | null;
    reviewsCount: number;
};

export default function ClubPage() {
    const params = useParams<{ locale: string; slug: string }>();
    const router = useRouter();
    const [joining, setJoining] = useState(false);
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const portalQuery = useQuery({
        queryKey: ["public-portal", params.slug],
        queryFn: async () => {
            const res = await $api.GET("/public/portals/{slug}", {
                params: { path: { slug: params.slug } },
            });
            return res.data as PublicPortal | undefined;
        },
    });

    const meQuery = useQuery({
        queryKey: ["lk-me"],
        queryFn: async () => {
            const res = await $api.GET("/lk/auth/me");
            return res.data as
                | { id: string; memberships: { portalId: string }[] }
                | undefined;
        },
        retry: false,
    });

    const schemaQuery = useQuery({
        enabled: joining,
        queryKey: ["registration-schema", params.slug],
        queryFn: async () => {
            const res = await $api.GET("/lk/auth/member/registration-schema", {
                headers: { "X-Portal-Slug": params.slug },
            });
            return res.data as { fields: FormSchemaField[] } | undefined;
        },
    });

    const joinMutation = useMutation({
        mutationFn: async (fields: Record<string, unknown>) => {
            const res = await $api.POST("/lk/portals/{slug}/join", {
                params: { path: { slug: params.slug } },
                body: { fields },
            });
            if (res.error) {
                throw res.error;
            }
            return res.data;
        },
        onSuccess: () => {
            router.push(`/${params.locale}/profile/clubs`);
        },
        onError: (error) => {
            setServerError(getApiErrorMessage(error));
        },
    });

    const portal = portalQuery.data;
    const isAuthed = !!meQuery.data;
    const isMemberAlready =
        portal && meQuery.data
            ? meQuery.data.memberships.some((m) => m.portalId === portal.id)
            : false;

    const onJoinSubmit = () => {
        const fields = schemaQuery.data?.fields ?? [];
        const validation = validateDynamicValues(fields, values);
        setErrors(validation);
        if (Object.keys(validation).length > 0) {
            return;
        }
        setServerError(null);
        joinMutation.mutate(toSubmitPayload(values));
    };

    if (portalQuery.isLoading) {
        return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Загрузка…</div>;
    }
    if (!portal) {
        return <div className="mx-auto max-w-3xl px-4 py-10 text-destructive">Клуб не найден</div>;
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-2xl font-bold">{portal.displayName}</h1>
            {portal.averageRating !== null ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    {portal.averageRating} · {portal.reviewsCount} отзывов
                </p>
            ) : null}
            {portal.publicDescription ? (
                <p className="mt-4 text-muted-foreground">{portal.publicDescription}</p>
            ) : null}
            {portal.address || portal.city ? (
                <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    {[portal.address, portal.city, portal.country].filter(Boolean).join(", ")}
                </p>
            ) : null}

            <div className="mt-8">
                {isMemberAlready ? (
                    <p className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                        Вы уже участник этого клуба.
                    </p>
                ) : !isAuthed ? (
                    <Button onClick={() => router.push(`/${params.locale}/auth/register`)}>
                        Зарегистрируйтесь, чтобы вступить в клуб
                    </Button>
                ) : !joining ? (
                    <Button onClick={() => setJoining(true)}>Вступить в клуб</Button>
                ) : (
                    <div className="space-y-4 rounded-xl border p-4">
                        <h2 className="text-lg font-semibold">Анкета клуба</h2>
                        <p className="text-sm text-muted-foreground">
                            Документы и подпись из вашего аккаунта будут переданы клубу
                            автоматически.
                        </p>
                        {schemaQuery.isLoading ? (
                            <p className="text-muted-foreground">Загрузка формы…</p>
                        ) : (
                            <DynamicFormFields
                                fields={schemaQuery.data?.fields ?? []}
                                values={values}
                                errors={errors}
                                onChange={(fieldKey, value) =>
                                    setValues((prev) => ({ ...prev, [fieldKey]: value }))
                                }
                                disabled={joinMutation.isPending}
                            />
                        )}
                        {serverError ? (
                            <p className="text-sm text-destructive">{serverError}</p>
                        ) : null}
                        <div className="flex gap-2">
                            <Button onClick={onJoinSubmit} disabled={joinMutation.isPending}>
                                {joinMutation.isPending ? "Отправка…" : "Отправить"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setJoining(false)}
                                disabled={joinMutation.isPending}
                            >
                                Отмена
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

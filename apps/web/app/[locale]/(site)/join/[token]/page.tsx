"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@workspace/api-client/core";
import {
    DynamicFormFields,
    toSubmitPayload,
    validateDynamicValues,
    type FieldErrors,
    type FormSchemaField,
} from "@workspace/dynamic-forms";
import { Button, FieldInput } from "@workspace/ui";

import { $api } from "@/modules/shared/api";

type LinkInfo = {
    portalSlug: string;
    portalDisplayName: string;
    schema: { fields: FormSchemaField[] };
};

/** Регистрация member по ссылке-форме клуба (или на планшете клуба). */
export default function JoinByLinkPage() {
    const params = useParams<{ locale: string; token: string }>();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const infoQuery = useQuery({
        queryKey: ["reg-link", params.token],
        queryFn: async () => {
            const res = await $api.GET("/public/reg-links/{token}", {
                params: { path: { token: params.token } },
            });
            if (res.error) {
                throw res.error;
            }
            return res.data as unknown as LinkInfo;
        },
        retry: false,
    });

    const registerMutation = useMutation({
        mutationFn: async () => {
            const res = await $api.POST("/public/reg-links/{token}/register", {
                params: { path: { token: params.token } },
                body: {
                    email,
                    password: password || undefined,
                    fields: toSubmitPayload(values),
                },
            });
            if (res.error) {
                throw res.error;
            }
            return res.data;
        },
        onSuccess: () => {
            router.push(`/${params.locale}/auth/confirm-email?email=${encodeURIComponent(email)}`);
        },
        onError: (error) => {
            setServerError(getApiErrorMessage(error));
        },
    });

    const onSubmit = () => {
        const fields = infoQuery.data?.schema.fields ?? [];
        const validation = validateDynamicValues(fields, values);
        if (!email) {
            validation["__email"] = "Email обязателен";
        }
        setErrors(validation);
        if (Object.keys(validation).length > 0) {
            return;
        }
        setServerError(null);
        registerMutation.mutate();
    };

    if (infoQuery.isLoading) {
        return <div className="mx-auto max-w-2xl px-4 py-10 text-muted-foreground">Загрузка…</div>;
    }
    if (infoQuery.isError || !infoQuery.data) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-10 text-destructive">
                Ссылка недействительна или срок её действия истёк.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="text-2xl font-bold">
                Регистрация в клубе {infoQuery.data.portalDisplayName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Заполните анкету клуба. Если у вас уже есть аккаунт, созданный клубом, пароль
                активирует его.
            </p>

            <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <FieldInput
                        label="Email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={errors["__email"]}
                    />
                    <FieldInput
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={undefined}
                    />
                </div>

                <DynamicFormFields
                    fields={infoQuery.data.schema.fields}
                    values={values}
                    errors={errors}
                    onChange={(fieldKey, value) =>
                        setValues((prev) => ({ ...prev, [fieldKey]: value }))
                    }
                    disabled={registerMutation.isPending}
                />

                {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

                <Button
                    className="w-full"
                    onClick={onSubmit}
                    disabled={registerMutation.isPending}
                >
                    {registerMutation.isPending ? "Отправка…" : "Зарегистрироваться"}
                </Button>
            </div>
        </div>
    );
}

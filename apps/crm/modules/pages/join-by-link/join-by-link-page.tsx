"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import {
    DynamicFormFields,
    type FieldErrors,
    type FormSchemaField,
    toSubmitPayload,
    validateDynamicValues,
} from "@workspace/dynamic-forms";
import { Button, Card, FieldInput } from "@workspace/ui";

import {
    getPublicRegistrationLink,
    registerViaLink,
    useRegistrationLinkPresence,
} from "@/modules/entities/registration-links";

// Documents and the signature are attached to an existing member later, so the public form
// asks only for data fields — the same rule as the CRM's own "new member" form.
const FILE_TYPES = new Set(["file", "signature", "document"]);

/** Same rule as RegisterViaLinkDto.password on the API. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const EMAIL_KEY = "__email";
const PASSWORD_KEY = "__password";

/**
 * Регистрация участника по ссылке клуба — публичная страница CRM, без входа.
 * Живёт здесь, а не только в кабинете участника: кабинет на сервере может быть не поднят.
 */
export function JoinByLinkPage({ token }: { token: string }) {
    const t = useTranslations("join");

    const [typedEmail, setTypedEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [edited, setEdited] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const info = useQuery({
        queryKey: ["public-registration-link", token],
        queryFn: () => getPublicRegistrationLink(token),
        retry: false,
    });

    const dataFields = useMemo(
        () => (info.data?.schema.fields ?? []).filter((field) => !FILE_TYPES.has(field.type)),
        [info.data]
    );

    // A personal link opens with what the club already typed; what the person types wins.
    const prefill = info.data?.prefill;
    const email = typedEmail ?? prefill?.email ?? "";
    const values = useMemo(() => ({ ...prefill?.fields, ...edited }), [prefill, edited]);

    // The club sees how many people have the form open; stops once the form is sent.
    const [sent, setSent] = useState(false);
    useRegistrationLinkPresence(token, Boolean(info.data) && !sent);

    const register = useMutation({
        mutationFn: () =>
            registerViaLink(token, {
                email: email.trim().toLowerCase(),
                password: password || undefined,
                fields: toSubmitPayload(values),
            }),
        onSuccess: () => setSent(true),
        onError: (error) => setServerError(getApiErrorMessage(error)),
    });

    const submit = () => {
        const validation = validateDynamicValues(dataFields as FormSchemaField[], values);
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            validation[EMAIL_KEY] = t("errors.email");
        }
        if (password && (password.length < 8 || !PASSWORD_RULE.test(password))) {
            validation[PASSWORD_KEY] = t("errors.password");
        }
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        setServerError(null);
        register.mutate();
    };

    if (info.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (info.isError || !info.data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="w-full max-w-md p-6 text-center">
                    <p className="text-sm text-destructive">{t("invalid")}</p>
                </Card>
            </div>
        );
    }

    if (register.isSuccess) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="w-full max-w-md p-6 text-center">
                    <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
                    <h1 className="mt-3 text-xl font-semibold">{t("done.title")}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t(register.data.accountCreated ? "done.checkEmail" : "done.existing", {
                            club: info.data.portalDisplayName,
                        })}
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-2xl p-6">
                <h1 className="text-xl font-semibold">
                    {t("title", { club: info.data.portalDisplayName })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

                <div className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FieldInput
                            label={t("email")}
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setTypedEmail(event.target.value)}
                            error={errors[EMAIL_KEY]}
                        />
                        <FieldInput
                            label={t("password")}
                            type="password"
                            autoComplete="new-password"
                            helperText={t("passwordHelp")}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            error={errors[PASSWORD_KEY]}
                        />
                    </div>

                    <DynamicFormFields
                        fields={dataFields}
                        values={values}
                        errors={errors}
                        onChange={(fieldKey, value) =>
                            setEdited((prev) => ({ ...prev, [fieldKey]: value }))
                        }
                        disabled={register.isPending}
                    />

                    {serverError && <p className="text-sm text-destructive">{serverError}</p>}

                    <Button className="w-full" onClick={submit} disabled={register.isPending}>
                        {register.isPending ? t("submitting") : t("submit")}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

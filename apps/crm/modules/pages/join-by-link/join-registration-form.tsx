"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useMutation } from "@tanstack/react-query";

import {
    ApiClientError,
    getApiErrorMessage,
    type SchemaRegisterViaLinkResponseDto,
} from "@workspace/api-client/core";
import {
    DynamicFormFields,
    type FieldErrors,
    type FormSchemaField,
    toSubmitPayload,
    validateDynamicValues,
} from "@workspace/dynamic-forms";
import { Button, Card, FieldInput } from "@workspace/ui";

import {
    type PublicRegistrationLinkInfo,
    registerViaLink,
} from "@/modules/entities/registration-links";
import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";

/** Same rule as RegisterViaLinkDto.password on the API. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_KEY = "__email";
const PASSWORD_KEY = "__password";

interface JoinRegistrationFormProps {
    token: string;
    info: PublicRegistrationLinkInfo;
    fields: FormSchemaField[];
    onDone: (result: SchemaRegisterViaLinkResponseDto) => void;
}

/**
 * Анкета клуба по ссылке без входа: email, пароль и поля формы клуба. Личная ссылка открывается
 * с тем, что вписал клуб, — набранное человеком важнее.
 *
 * Киоск (общий планшет клуба): без Google и без подсказок браузеру сохранить адрес и пароль;
 * существующий аккаунт здесь не вступает (API отвечает 409) — ему предлагается телефон.
 */
export function JoinRegistrationForm({ token, info, fields, onDone }: JoinRegistrationFormProps) {
    const t = useTranslations("join");
    const locale = useLocale();
    const kiosk = info.kind === "kiosk";

    const [typedEmail, setTypedEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [edited, setEdited] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<FieldErrors>({});

    const prefill = info.prefill;
    const email = typedEmail ?? prefill?.email ?? "";
    const values = useMemo(() => ({ ...prefill?.fields, ...edited }), [prefill, edited]);

    const register = useMutation({
        mutationFn: () =>
            registerViaLink(token, {
                email: email.trim().toLowerCase(),
                password: password || undefined,
                fields: toSubmitPayload(values),
            }),
        onSuccess: onDone,
    });

    const serverError = register.error
        ? kiosk && register.error instanceof ApiClientError && register.error.status === 409
            ? t("kiosk.existingAccount")
            : getApiErrorMessage(register.error)
        : null;

    const submit = () => {
        const validation = validateDynamicValues(fields, values);
        if (!EMAIL_RULE.test(email.trim())) {
            validation[EMAIL_KEY] = t("errors.email");
        }
        if (password && (password.length < 8 || !PASSWORD_RULE.test(password))) {
            validation[PASSWORD_KEY] = t("errors.password");
        }
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        register.mutate();
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-2xl p-6">
                <h1 className="text-xl font-semibold">
                    {t("title", { club: info.portalDisplayName })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {kiosk ? t("kiosk.subtitle") : t("subtitle")}
                </p>

                <div className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FieldInput
                            label={t("email")}
                            type="email"
                            required
                            autoComplete={kiosk ? "off" : "email"}
                            value={email}
                            onChange={(event) => setTypedEmail(event.target.value)}
                            error={errors[EMAIL_KEY]}
                        />
                        <FieldInput
                            label={t("password")}
                            type="password"
                            autoComplete={kiosk ? "off" : "new-password"}
                            helperText={t("passwordHelp")}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            error={errors[PASSWORD_KEY]}
                        />
                    </div>

                    <DynamicFormFields
                        fields={fields}
                        values={values}
                        errors={errors}
                        onChange={(fieldKey, value) =>
                            setEdited((previous) => ({ ...previous, [fieldKey]: value }))
                        }
                        disabled={register.isPending}
                    />

                    {serverError && (
                        <p role="alert" className="text-sm text-destructive">
                            {serverError}
                        </p>
                    )}

                    <Button className="w-full" onClick={submit} disabled={register.isPending}>
                        {register.isPending ? t("submitting") : t("submit")}
                    </Button>

                    {!kiosk && (
                        <GoogleButton
                            href={googleSignInUrl("cabinet", {
                                locale,
                                returnTo: `/${locale}/join/${token}`,
                            })}
                            label={t("google")}
                            separator={t("or")}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
}

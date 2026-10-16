"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage, type SchemaMemberMeResponseDto } from "@workspace/api-client/core";
import {
    DynamicFormFields,
    type FieldErrors,
    type FormSchemaField,
    toSubmitPayload,
    validateDynamicValues,
} from "@workspace/dynamic-forms";
import { Button, Card, Switch } from "@workspace/ui";

import { useAccountDocuments } from "@/modules/entities/membership";
import { useJoinViaLinkAsMember } from "@/modules/entities/registration-links";
import { cabinetAppUrl } from "@/modules/shared/config/app-urls";
import { StatusCard } from "@/modules/shared/ui/StatusCard";

interface SignedInJoinProps {
    token: string;
    account: SchemaMemberMeResponseDto;
    club: string;
    fields: FormSchemaField[];
    prefill?: Record<string, unknown>;
    onUseOtherAccount: () => void;
}

/**
 * Ссылка клуба открыта под сессией участника: вступает его собственный аккаунт, без нового
 * пароля и письма. Документы клуб получает только те, что участник здесь же отметил, —
 * по умолчанию не показывается ничего (TASK-704).
 */
export function SignedInJoin({
    token,
    account,
    club,
    fields,
    prefill,
    onUseOtherAccount,
}: SignedInJoinProps) {
    const t = useTranslations("join.signedIn");
    const passport = useTranslations("cabinet.passport");
    const locale = useLocale();
    const documents = useAccountDocuments();
    const join = useJoinViaLinkAsMember(token);

    const [edited, setEdited] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [shared, setShared] = useState<ReadonlySet<string>>(new Set());
    const [shareSignature, setShareSignature] = useState(false);

    const values = useMemo(() => ({ ...prefill, ...edited }), [prefill, edited]);
    const docs = documents.data?.documents ?? [];
    const hasSignature = documents.data?.hasSignature === true;

    const toggle = (id: string, on: boolean) =>
        setShared((previous) => {
            const next = new Set(previous);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    const submit = () => {
        const validation = validateDynamicValues(fields, values);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        join.mutate({
            fields: toSubmitPayload(values),
            shareDocumentIds: Array.from(shared),
            shareSignature,
        });
    };

    if (join.isSuccess) {
        const cabinet = cabinetAppUrl(`/${locale}/${join.data.portalSlug}`);
        return (
            <StatusCard tone="success" title={t("done.title")} text={t("done.text", { club })}>
                {cabinet && (
                    <Button asChild className="w-full">
                        <a href={cabinet}>{t("done.open")}</a>
                    </Button>
                )}
            </StatusCard>
        );
    }

    const documentLabel = (type: string, side: string) => {
        const typeLabel = passport.has(`types.${type}`) ? passport(`types.${type}`) : type;
        return `${typeLabel} · ${passport(`sides.${side}`)}`;
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-2xl p-6">
                <h1 className="text-xl font-semibold">{t("title", { club })}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("subtitle", { email: account.email })}
                </p>

                <div className="mt-6 space-y-6">
                    <DynamicFormFields
                        fields={fields}
                        values={values}
                        errors={errors}
                        onChange={(fieldKey, value) =>
                            setEdited((previous) => ({ ...previous, [fieldKey]: value }))
                        }
                        disabled={join.isPending}
                    />

                    <section className="space-y-2">
                        <h2 className="text-sm font-medium">{t("documents")}</h2>
                        {documents.isLoading ? (
                            <Loader2
                                className="size-4 animate-spin text-muted-foreground"
                                aria-hidden="true"
                            />
                        ) : docs.length === 0 && !hasSignature ? (
                            <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                        ) : (
                            <ul className="space-y-2">
                                {docs.map((document) => {
                                    const label = documentLabel(document.type, document.side);
                                    return (
                                        <li
                                            key={document.id}
                                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                                        >
                                            <span>{label}</span>
                                            <Switch
                                                checked={shared.has(document.id)}
                                                onCheckedChange={(on) => toggle(document.id, on)}
                                                disabled={join.isPending}
                                                aria-label={label}
                                            />
                                        </li>
                                    );
                                })}
                                {hasSignature && (
                                    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                        <span>{passport("signature.title")}</span>
                                        <Switch
                                            checked={shareSignature}
                                            onCheckedChange={setShareSignature}
                                            disabled={join.isPending}
                                            aria-label={passport("signature.title")}
                                        />
                                    </li>
                                )}
                            </ul>
                        )}
                        <p className="text-xs text-muted-foreground">{t("hint")}</p>
                    </section>

                    {join.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {getApiErrorMessage(join.error)}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Button className="w-full" onClick={submit} disabled={join.isPending}>
                            {join.isPending ? t("submitting") : t("submit")}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={onUseOtherAccount}
                            disabled={join.isPending}
                        >
                            {t("otherAccount")}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

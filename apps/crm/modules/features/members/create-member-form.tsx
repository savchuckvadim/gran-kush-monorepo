"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@workspace/api-client/core";
import {
    DynamicFormFields,
    type FormSchemaField,
    toSubmitPayload,
    validateDynamicValues,
} from "@workspace/dynamic-forms";
import { Button, FieldInput } from "@workspace/ui";

import { useCreateCrmMember, useCrmMemberCreateSchema } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

// Documents and signatures are uploaded to an existing member, so they wait for the profile.
const FILE_TYPES = new Set(["file", "signature", "document"]);

const emailSchema = z.string().trim().email();

/** What is typed so far — for actions composed next to the form (a personal sign-up link). */
export interface CreateMemberDraft {
    email: string;
    fields: Record<string, unknown>;
    who: string;
}

/**
 * Новый участник из CRM. Поля и обязательность — из формы «Добавление в CRM» этого клуба
 * (purpose crm_create, у каждого портала своя); API проверяет данные по той же форме.
 */
export function CreateMemberForm({
    renderDraftAction,
}: {
    /** Slot next to the email field, fed with what is typed so far. */
    renderDraftAction?: (draft: CreateMemberDraft) => React.ReactNode;
} = {}) {
    const t = useTranslations("crm.members.create");
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const schema = useCrmMemberCreateSchema();
    const createMember = useCreateCrmMember();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string>();
    const [edited, setEdited] = useState<Record<string, unknown>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const fields = useMemo(() => (schema.data?.fields ?? []) as FormSchemaField[], [schema.data]);
    const dataFields = useMemo(
        () => fields.filter((field) => !FILE_TYPES.has(field.type)),
        [fields]
    );
    const values = useMemo(() => {
        const defaults: Record<string, unknown> = {};
        for (const field of dataFields) {
            if (field.defaultValueJson != null) defaults[field.fieldKey] = field.defaultValueJson;
        }
        return { ...defaults, ...edited };
    }, [dataFields, edited]);

    const submit = () => {
        const parsedEmail = emailSchema.safeParse(email);
        setEmailError(parsedEmail.success ? undefined : t("emailInvalid"));
        const errors = validateDynamicValues(dataFields, values);
        setFieldErrors(errors);
        if (!parsedEmail.success || Object.keys(errors).length > 0) return;

        createMember.mutate(
            { email: parsedEmail.data, fields: toSubmitPayload(values) },
            {
                onSuccess: ({ memberId, isNewUser }) => {
                    toast.success(t(isNewUser ? "created" : "createdExisting"));
                    router.push(localizedLink(`${ROUTES.CRM_MEMBER_DETAILS}/${memberId}`));
                },
            }
        );
    };

    if (schema.isLoading) {
        return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
    }
    if (schema.isError) {
        return <p className="text-destructive text-sm">{getApiErrorMessage(schema.error)}</p>;
    }

    return (
        <form
            noValidate
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {createMember.isError && (
                <div className="border-destructive bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                    {getApiErrorMessage(createMember.error)}
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
                <FieldInput
                    label={t("email")}
                    type="email"
                    autoComplete="off"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={emailError}
                    helperText={t("emailHelp")}
                />
                {renderDraftAction && (
                    <div className="flex items-start pt-6 md:justify-end">
                        {renderDraftAction({
                            email,
                            fields: toSubmitPayload(values),
                            who: [values.first_name, values.last_name]
                                .filter((part) => typeof part === "string" && part.trim())
                                .join(" "),
                        })}
                    </div>
                )}
            </div>

            <DynamicFormFields
                fields={fields}
                values={values}
                errors={fieldErrors}
                disabled={createMember.isPending}
                onChange={(key, value) => setEdited((prev) => ({ ...prev, [key]: value }))}
                renderFileField={({ field }) => (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                        <span>
                            <span className="text-foreground font-medium">
                                {field.label?.trim() || field.fieldKey}
                            </span>{" "}
                            — {t("filesLater")}
                        </span>
                    </p>
                )}
            />

            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={createMember.isPending}>
                    {createMember.isPending ? t("submitting") : t("submit")}
                </Button>
                <Button variant="ghost" asChild>
                    <Link href={localizedLink(ROUTES.CRM_MEMBERS)}>{t("cancel")}</Link>
                </Button>
            </div>
        </form>
    );
}

export function NewMemberButton() {
    const t = useTranslations("crm.members.create");
    const localizedLink = useLocalizedLink();
    return (
        <Button asChild>
            <Link href={localizedLink(ROUTES.CRM_MEMBER_NEW)}>{t("button")}</Link>
        </Button>
    );
}

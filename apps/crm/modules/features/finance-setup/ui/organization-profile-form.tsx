"use client";

import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import {
    ORGANIZATION_ERROR_FIELDS,
    type OrganizationProfile,
    useSaveOrganizationProfile,
} from "@/modules/entities/finance";

import {
    inputFromValues,
    organizationProfileSchema,
    type OrganizationProfileValues,
    valuesFromProfile,
} from "../model/organization-profile-schema";

import { OrganizationTaxFields } from "./organization-tax-fields";
import { OrganizationTextFields, type OrganizationTextFieldSpec } from "./organization-text-fields";

const IDENTITY_FIELDS: readonly OrganizationTextFieldSpec[] = [
    { name: "legalName", required: true, wide: true, autoComplete: "organization" },
    { name: "tradeName" },
    { name: "taxId" },
    { name: "iban" },
    { name: "addressLine", wide: true, autoComplete: "street-address" },
    { name: "postalCode", autoComplete: "postal-code" },
    { name: "city", autoComplete: "address-level2" },
    { name: "province", autoComplete: "address-level1" },
    { name: "email", type: "email", autoComplete: "email" },
    { name: "phone", type: "tel", autoComplete: "tel" },
];

const GESTOR_FIELDS: readonly OrganizationTextFieldSpec[] = [
    { name: "gestorName", wide: true },
    { name: "gestorEmail", type: "email" },
    { name: "gestorPhone", type: "tel" },
];

interface OrganizationProfileFormProps {
    profile: OrganizationProfile;
    /** finance.admin: без права форма только для чтения */
    canEdit: boolean;
    submitLabel: string;
    onSaved?: (saved: OrganizationProfile) => void;
}

/**
 * Профиль организации тремя блоками: форма и налоги, реквизиты, gestor. Номера проверяет API:
 * код отказа (`invalid_tax_id`, `invalid_iban`…) подсвечивает своё поле, а не всплывает текстом.
 */
export function OrganizationProfileForm({
    profile,
    canEdit,
    submitLabel,
    onSaved,
}: OrganizationProfileFormProps) {
    const t = useTranslations("crm.finance.profile");
    const save = useSaveOrganizationProfile();
    const form = useForm<OrganizationProfileValues>({
        resolver: zodResolver(organizationProfileSchema),
        defaultValues: valuesFromProfile(profile),
    });
    const legalForm = useWatch({ control: form.control, name: "legalForm" });
    const disabled = !canEdit || save.isPending;

    const submit = form.handleSubmit((values) =>
        save.mutate(inputFromValues(values), {
            onSuccess: (saved) => {
                form.reset(valuesFromProfile(saved));
                toast.success(t("saved"));
                onSaved?.(saved);
            },
            onError: (error) => {
                const code = getApiErrorCode(error);
                const field = code ? ORGANIZATION_ERROR_FIELDS[code] : undefined;
                if (code && field) {
                    form.setError(field, { message: code });
                    return;
                }
                toast.error(getApiErrorMessage(error));
            },
        })
    );

    const sections = [
        { id: "tax", body: <OrganizationTaxFields form={form} disabled={disabled} /> },
        {
            id: "identity",
            body: (
                <OrganizationTextFields
                    form={form}
                    fields={IDENTITY_FIELDS}
                    disabled={disabled}
                    hint={(name) => (name === "taxId" ? t(`taxIdHint.${legalForm}`) : undefined)}
                />
            ),
        },
        {
            id: "gestor",
            body: <OrganizationTextFields form={form} fields={GESTOR_FIELDS} disabled={disabled} />,
        },
    ] as const;

    return (
        <form onSubmit={submit} className="max-w-3xl space-y-4" noValidate>
            {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}
            {sections.map((section) => (
                <Card key={section.id} padding="md" contentClassName="space-y-4 px-0">
                    <div>
                        <h2 className="font-semibold">{t(`sections.${section.id}`)}</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {t(`sectionHints.${section.id}`)}
                        </p>
                    </div>
                    {section.body}
                </Card>
            ))}
            {canEdit && (
                <div className="flex justify-end">
                    <Button type="submit" disabled={save.isPending}>
                        {save.isPending ? t("saving") : submitLabel}
                    </Button>
                </div>
            )}
        </form>
    );
}

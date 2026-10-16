"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { UseFormRegisterReturn } from "react-hook-form";

import { FieldInput } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";

import { makePortalSlug } from "../lib/portal-slug";

interface ClubFieldsProps {
    displayName: UseFormRegisterReturn;
    slug: UseFormRegisterReturn;
    errors: { displayName?: string; slug?: string };
    /** The slug as it is now: the help text shows the future CRM address. */
    slugValue: string;
    /** Fills the slug from the club name until the owner edits the slug by hand. */
    setSlug: (slug: string) => void;
}

/** Club name and its address; the address follows the name until it is edited by hand. */
export function ClubFields({ displayName, slug, errors, slugValue, setSlug }: ClubFieldsProps) {
    const t = useTranslations("auth.portalRegister");
    const locale = useLocale();
    const [slugEdited, setSlugEdited] = useState(false);
    const crmAddress = `/${locale}/${slugValue || "…"}${ROUTES.CRM_HOME}`;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <FieldInput
                label={t("displayName")}
                type="text"
                error={errors.displayName}
                required
                placeholder="Green Club"
                {...displayName}
                onChange={(event) => {
                    void displayName.onChange(event);
                    if (!slugEdited) setSlug(makePortalSlug(event.target.value));
                }}
            />
            <FieldInput
                label={t("slug")}
                type="text"
                error={errors.slug}
                helperText={t("slugHelp", { url: crmAddress })}
                required
                autoCapitalize="none"
                spellCheck={false}
                placeholder="green-club"
                {...slug}
                onChange={(event) => {
                    setSlugEdited(true);
                    void slug.onChange(event);
                }}
            />
        </div>
    );
}

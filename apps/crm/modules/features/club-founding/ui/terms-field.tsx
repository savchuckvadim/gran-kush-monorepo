"use client";

import { useLocale, useTranslations } from "next-intl";

import type { UseFormRegisterReturn } from "react-hook-form";

import { Field } from "@workspace/ui";

import { LegalLink } from "./legal-link";

/** Acceptance of the Terms and the Data processing agreement: required to found a club. */
export function TermsField({
    registration,
    error,
}: {
    registration: UseFormRegisterReturn;
    error?: string;
}) {
    const t = useTranslations("auth.portalRegister");
    const locale = useLocale();

    return (
        <Field error={error}>
            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                    aria-invalid={error ? "true" : undefined}
                    {...registration}
                />
                <span>
                    {t.rich("acceptTerms", {
                        terms: (chunks) => (
                            <LegalLink locale={locale} doc="terminos">
                                {chunks}
                            </LegalLink>
                        ),
                        dpa: (chunks) => (
                            <LegalLink locale={locale} doc="encargo">
                                {chunks}
                            </LegalLink>
                        ),
                        privacy: (chunks) => (
                            <LegalLink locale={locale} doc="privacidad">
                                {chunks}
                            </LegalLink>
                        ),
                    })}
                </span>
            </label>
        </Field>
    );
}

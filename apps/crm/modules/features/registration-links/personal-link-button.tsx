"use client";

import { useLocale, useTranslations } from "next-intl";

import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { buildJoinUrl, useCreateRegistrationLink } from "@/modules/entities/registration-links";

interface PersonalLinkButtonProps {
    email: string;
    /** Values already typed into the CRM form, keyed by fieldKey. */
    fields: Record<string, unknown>;
    /** Who the link is for, shown in the issued links list. */
    who?: string;
}

/**
 * Turns a half-filled «new member» form into a personal one-time link and opens it in a new tab:
 * the person finishes the form themselves (and signs on their phone), with what is typed carried over.
 */
export function PersonalLinkButton({ email, fields, who }: PersonalLinkButtonProps) {
    const t = useTranslations("crm.registrationLinks.personal");
    const locale = useLocale();
    const create = useCreateRegistrationLink();

    const open = async () => {
        // the tab is opened inside the click, before the request: an async window.open is blocked
        const tab = window.open("about:blank", "_blank");
        try {
            const link = await create.mutateAsync({
                name: t("name", { who: who?.trim() || email.trim() || t("fallbackWho") }),
                kind: "personal",
                prefill: {
                    ...(email.trim() ? { email: email.trim() } : {}),
                    fields,
                },
            });
            const url = buildJoinUrl(locale, link.token);
            if (tab) {
                tab.opener = null;
                tab.location.href = url;
                toast.success(t("created"));
            } else {
                await navigator.clipboard.writeText(url).catch(() => undefined);
                toast.info(t("popupBlocked"));
            }
        } catch (error) {
            tab?.close();
            toast.error(getApiErrorMessage(error));
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            title={t("hint")}
            aria-label={t("open")}
            disabled={create.isPending}
            onClick={() => void open()}
        >
            {create.isPending ? <Loader2 className="animate-spin" /> : <ExternalLink />}
        </Button>
    );
}

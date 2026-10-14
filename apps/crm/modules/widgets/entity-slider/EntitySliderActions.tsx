"use client";

import { useTranslations } from "next-intl";

import { ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

/** The panel bar: the entity's page in a new tab, and its link for a colleague. */
export function EntitySliderActions({ href }: { href: string }) {
    const t = useTranslations("crm.slider");

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
            toast.success(t("copied"));
        } catch {
            // no clipboard (an insecure context): the address bar already shows the link
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void copyLink()}
                aria-label={t("copyLink")}
                title={t("copyLink")}
            >
                <Link2 className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("openPage")}
                    title={t("openPage")}
                >
                    <ExternalLink className="size-4" aria-hidden="true" />
                </a>
            </Button>
        </>
    );
}

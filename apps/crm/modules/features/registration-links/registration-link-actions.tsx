"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link2, Settings2 } from "lucide-react";

import { Button } from "@workspace/ui";

import { RegistrationLinksDialog, type RegistrationLinksTab } from "./registration-links-dialog";

/** «Ссылка на регистрацию» next to «Новый участник», with a gear for every issued link. */
export function RegistrationLinkActions() {
    const t = useTranslations("crm.registrationLinks");
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<RegistrationLinksTab>("issue");

    const show = (next: RegistrationLinksTab) => {
        setTab(next);
        setOpen(true);
    };

    return (
        <div className="flex items-center gap-1">
            <Button type="button" variant="outline" onClick={() => show("issue")}>
                <Link2 />
                <span className="hidden sm:inline">{t("button")}</span>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t("manage")}
                aria-label={t("manage")}
                onClick={() => show("issued")}
            >
                <Settings2 />
            </Button>
            <RegistrationLinksDialog
                open={open}
                onOpenChange={setOpen}
                tab={tab}
                onTabChange={setTab}
            />
        </div>
    );
}

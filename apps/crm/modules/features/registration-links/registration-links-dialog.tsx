"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { IssuePanel } from "./issue-panel";
import { LinksList } from "./links-list";

export type RegistrationLinksTab = "issue" | "issued";

interface RegistrationLinksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tab: RegistrationLinksTab;
    onTabChange: (tab: RegistrationLinksTab) => void;
}

/** One dialog for both entries: the "link" button opens «Выдать», the gear opens «Выданные». */
export function RegistrationLinksDialog({
    open,
    onOpenChange,
    tab,
    onTabChange,
}: RegistrationLinksDialogProps) {
    const t = useTranslations("crm.registrationLinks");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="bg-muted/60 inline-flex w-fit rounded-full p-1" role="tablist">
                    {(["issue", "issued"] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => onTabChange(value)}
                            className={cn(
                                "rounded-full px-4 py-1.5 text-sm transition-colors",
                                tab === value
                                    ? "bg-background font-medium shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(`tabs.${value}`)}
                        </button>
                    ))}
                </div>

                {/* the list polls online counters only while it is on screen */}
                {tab === "issue" ? <IssuePanel /> : <LinksList live={open} />}
            </DialogContent>
        </Dialog>
    );
}

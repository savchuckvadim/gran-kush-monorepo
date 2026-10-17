"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ScanQrCode, UserPlus } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { RegistrationLinksDialog, type RegistrationLinksTab } from "@/modules/features";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/**
 * The two things done at the door: hand someone a sign-up link (`members.invite`) and scan a
 * member's QR (`presence.checkin`). Each shows only to those whose role has the permission.
 */
export function HeaderQuickActions() {
    const t = useTranslations("crm.shell.quick");
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const [linksOpen, setLinksOpen] = useState(false);
    const [linksTab, setLinksTab] = useState<RegistrationLinksTab>("issue");

    const { can } = usePermissions();
    const canIssueLinks = can("members.invite");
    const canScan = can("presence.checkin");

    // a fresh value every time: the attendance page keys the scanner on it and opens it again
    const openScanner = () =>
        router.push(localizedLink(`${ROUTES.CRM_ATTENDANCE}?scanner=${Date.now()}`));

    return (
        <div className="flex items-center">
            {canIssueLinks && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("invite")}
                        title={t("invite")}
                        onClick={() => {
                            setLinksTab("issue");
                            setLinksOpen(true);
                        }}
                        className="rounded-full"
                    >
                        <UserPlus />
                    </Button>
                    <RegistrationLinksDialog
                        open={linksOpen}
                        onOpenChange={setLinksOpen}
                        tab={linksTab}
                        onTabChange={setLinksTab}
                    />
                </>
            )}
            {canScan && (
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("scanner")}
                    title={t("scanner")}
                    onClick={openScanner}
                    className="rounded-full"
                >
                    <ScanQrCode />
                </Button>
            )}
        </div>
    );
}

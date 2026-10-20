"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ScanQrCode, UserPlus } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { RegistrationLinksDialog, type RegistrationLinksTab } from "@/modules/features";
import { scannerStore } from "@/modules/shared/lib/scan";
import { SCANNER_PERMISSIONS } from "@/modules/widgets/scanner";

/**
 * The two things done at the door: hand someone a sign-up link (`members.invite`) and the scanner
 * — a member's QR, a product label or a barcode, on any page (`SCANNER_PERMISSIONS`). Each shows
 * only to those whose role has a permission for it.
 */
export function HeaderQuickActions() {
    const t = useTranslations("crm.shell.quick");
    const [linksOpen, setLinksOpen] = useState(false);
    const [linksTab, setLinksTab] = useState<RegistrationLinksTab>("issue");

    const { can } = usePermissions();
    const canIssueLinks = can("members.invite");
    const canScan = SCANNER_PERMISSIONS.some((code) => can(code));

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
                    onClick={() => scannerStore.open()}
                    className="rounded-full"
                >
                    <ScanQrCode />
                </Button>
            )}
        </div>
    );
}

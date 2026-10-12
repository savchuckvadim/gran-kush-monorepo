"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ScanQrCode, UserPlus } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePortalInfo } from "@/modules/entities/portal";
import { RegistrationLinksDialog, type RegistrationLinksTab } from "@/modules/features";
import { useAuth } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const MANAGING_ROLES = new Set(["portal_owner", "admin"]);

/**
 * The two things done at the door: hand someone a sign-up link (owners and admins — the API
 * lets only them issue links) and scan a member's QR. Both stay on phones.
 */
export function HeaderQuickActions() {
    const t = useTranslations("crm.shell.quick");
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const [linksOpen, setLinksOpen] = useState(false);
    const [linksTab, setLinksTab] = useState<RegistrationLinksTab>("issue");

    const role = currentUser?.employments.find(
        (employment) => employment.portalId === info?.portalId
    )?.role;
    const canIssueLinks = role !== undefined && MANAGING_ROLES.has(role);

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
        </div>
    );
}

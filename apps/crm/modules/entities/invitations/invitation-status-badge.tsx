"use client";

import { useTranslations } from "next-intl";

import { Badge, type BadgeProps } from "@workspace/ui";

import type { Invitation } from "./api";

type InvitationStatus = Invitation["status"];

const VARIANT: Readonly<Record<InvitationStatus, BadgeProps["variant"]>> = {
    pending: "warning",
    accepted: "success",
    revoked: "secondary",
    expired: "destructive",
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
    const t = useTranslations("crm.invitations.statuses");

    return <Badge variant={VARIANT[status]}>{t(status)}</Badge>;
}

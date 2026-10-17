"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Trash2 } from "lucide-react";

import { Button } from "@workspace/ui";

import {
    type Invitation,
    InvitationStatusBadge,
    useInvitations,
} from "@/modules/entities/invitations";
import { RevokeInvitationDialog } from "@/modules/features/invitations";
import { useDateFormat } from "@/modules/shared/lib/use-date-format";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";

/** Приглашения сотрудников клуба; ждущее ответа можно отозвать. */
export function InvitationsList() {
    const t = useTranslations("crm.invitations");
    const tRoles = useTranslations("crm.employees.roles");
    const date = useDateFormat();
    const { data = [], isPending, error } = useInvitations();
    const [revoking, setRevoking] = useState<Invitation | null>(null);

    const columns: EntityListTableColumn<Invitation>[] = [
        {
            key: "email",
            header: t("columns.email"),
            cell: (invitation) => invitation.email,
            cellClassName: "font-medium",
        },
        {
            key: "role",
            header: t("columns.role"),
            cell: (invitation) => tRoles(invitation.role),
        },
        {
            key: "status",
            header: t("columns.status"),
            cell: (invitation) => <InvitationStatusBadge status={invitation.status} />,
        },
        {
            key: "createdAt",
            header: t("columns.createdAt"),
            cell: (invitation) => date(invitation.createdAt),
        },
        {
            key: "expiresAt",
            header: t("columns.expiresAt"),
            cell: (invitation) => date(invitation.expiresAt),
        },
    ];

    const revokeAction = (invitation: Invitation) =>
        invitation.status === "pending" ? (
            <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setRevoking(invitation)}
            >
                <Trash2 className="size-4" aria-hidden="true" />
                {t("revoke.button")}
            </Button>
        ) : null;

    return (
        <>
            <EntityList<Invitation>
                items={data}
                loading={isPending}
                error={error ? t("loadError") : undefined}
                emptyState={
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(invitation) => invitation.id}
                tableColumns={columns}
                defaultViewMode="table"
                viewModeStorageKey="crm-invitations"
                reserveFilterSpace={false}
                cardTitle={(invitation) => invitation.email}
                defaultVisibleCardFieldKeys={["role", "status", "expiresAt"]}
                renderRowActions={revokeAction}
                renderCardActions={revokeAction}
            />
            <RevokeInvitationDialog invitation={revoking} onClose={() => setRevoking(null)} />
        </>
    );
}

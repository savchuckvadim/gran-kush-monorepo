"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { CrmMemberListItem, useCrmMembers } from "@/modules/entities/member";
import { EntityList, EntityListTableColumn } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberListCounter } from "./MemberListCounter";

export function MemberList() {
    const t = useTranslations("crm.members");
    const { data: members, isLoading, error } = useCrmMembers();
    const router = useRouter();
    const toAppPath = useLocalizedLink();
    const makeMemberPath = (memberId: string) =>
        toAppPath(`${ROUTES.CRM_MEMBER_DETAILS}/${memberId}`);
    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error.message}</div>;
    }
    if (!members) {
        return <div>No members found</div>;
    }
    const tableColumns = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (member: CrmMemberListItem) => `${member.name} ${member.surname ?? ""}`,
        },
        {
            key: "email",
            header: t("columns.email"),
            cell: (member: CrmMemberListItem) => member.email,
        },
        {
            key: "phone",
            header: t("columns.phone"),
            cell: (member: CrmMemberListItem) => member.phone,
        },
        {
            key: "status",
            header: t("columns.status"),
            cell: (member: CrmMemberListItem) => member.status,
        },
        {
            key: "action",
            header: t("columns.action"),
            cell: (member: CrmMemberListItem) => (
                <Button variant="outline" size="sm" asChild>
                    <Link href={makeMemberPath(member.id)}>{t("openProfile")}</Link>
                </Button>
            ),
        },
    ] as EntityListTableColumn<CrmMemberListItem>[];

    return (
        <div className="space-y-3">
            <div className="w-full flex items-center justify-end">
            <MemberListCounter />
            </div>
            <EntityList<CrmMemberListItem>
                items={members ?? []}
                getRowKey={(member) => member.id}
                tableColumns={tableColumns}
                isRowClickable={true}
                onRowClick={(member) => {
                    router.push(makeMemberPath(member.id));
                }}
            />
        </div>
    );
}

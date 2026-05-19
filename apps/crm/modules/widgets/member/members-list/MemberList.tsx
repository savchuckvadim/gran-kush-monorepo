"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import {
    CrmMemberListFilters,
    CrmMemberListItem,
    useCrmMembers,
    useMembersListMeta,
} from "@/modules/entities/member";
import { EntityList, EntityListTableColumn } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberListCounter } from "./MemberListCounter";

export function MemberList() {
    const t = useTranslations("crm.members");
    const [statusItemId, setStatusItemId] = useState("");
    const [filterFieldKey, setFilterFieldKey] = useState("");
    const [filterValue, setFilterValue] = useState("");

    const listFilters = useMemo((): CrmMemberListFilters => {
        const f: CrmMemberListFilters = {};
        if (statusItemId) {
            f.statusItemId = statusItemId;
        }
        if (filterFieldKey && filterValue !== "") {
            f.filterFieldKey = filterFieldKey;
            f.filterValue = filterValue;
        }
        return f;
    }, [statusItemId, filterFieldKey, filterValue]);

    // const metaQuery = useQuery({
    //     queryKey: ["crm-members-list-meta"],
    //     queryFn: async () => ({
    //         statuses: await fetchCrmMemberStatusItems(),
    //         filterFields: await fetchCrmMemberFilterFields(),
    //     }),
    // });
    const { statuses, filterFields, isMetaLoading, isMetaError } = useMembersListMeta(true);
    const { data: members, isLoading, error } = useCrmMembers(100, listFilters);
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
            cell: (member: CrmMemberListItem) => {
                const si = member.statusItem;
                if (!si) {
                    return member.status;
                }
                return (
                    <span className="inline-flex items-center gap-2">
                        {si.color ? (
                            <span
                                className="inline-block size-2.5 rounded-full"
                                style={{ backgroundColor: si.color }}
                                aria-hidden
                            />
                        ) : null}
                        {si.label}
                    </span>
                );
            },
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

    // const filterFieldOptions = metaQuery.data?.filterFields ?? [];
    // const statusOptions = metaQuery.data?.statuses ?? [];

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 md:flex-row md:flex-wrap md:items-end">
                <div className="flex min-w-[160px] flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={statusItemId}
                        onChange={(e) => setStatusItemId(e.target.value)}
                        disabled={isMetaLoading || isMetaError}
                    >
                        <option value="">All</option>
                        {statuses?.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex min-w-[160px] flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Filter field</label>
                    <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={filterFieldKey}
                        onChange={(e) => {
                            setFilterFieldKey(e.target.value);
                            setFilterValue("");
                        }}
                        disabled={isMetaLoading || isMetaError}
                    >
                        <option value="">—</option>
                        {filterFields?.map((f) => (
                            <option key={f.fieldKey} value={f.fieldKey}>
                                {f.label ?? f.fieldKey}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Value</label>
                    <input
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="Exact match"
                        disabled={!filterFieldKey}
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="md:mb-0"
                    onClick={() => {
                        setStatusItemId("");
                        setFilterFieldKey("");
                        setFilterValue("");
                    }}
                >
                    Clear
                </Button>
            </div>

            <div className="flex w-full items-center justify-end">
                <MemberListCounter filters={listFilters} />
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

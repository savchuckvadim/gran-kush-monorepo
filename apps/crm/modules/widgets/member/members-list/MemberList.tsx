"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { toFilterFields } from "@/modules/entities/entity-settings";
import { CrmMemberListItem, useCrmMembers, useMembersListMeta } from "@/modules/entities/member";
import {
    EntityFilter,
    type EntityFilterField,
    EntityList,
    EntityListTableColumn,
    toFieldConditions,
    useEntityFilterParams,
} from "@/modules/shared";
import { useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

const PAGE_SIZE = 20;
/** The status is a column of the member's record, not a field: it goes as `statusItemId`. */
const STATUS_KEY = "status";

export function MemberList() {
    const t = useTranslations("crm.members");
    const openEntity = useOpenEntity();

    const { statuses, filterFields } = useMembersListMeta(true);
    const fields = useMemo<EntityFilterField[]>(
        () => [
            {
                key: STATUS_KEY,
                label: t("columns.status"),
                type: "select",
                isDefault: true,
                options: (statuses ?? []).map((status) => ({
                    value: status.id,
                    label: status.label,
                    color: status.color,
                })),
            },
            ...toFilterFields(filterFields ?? []).filter((field) => field.key !== STATUS_KEY),
        ],
        [statuses, filterFields, t]
    );
    const isMetaReady = statuses !== undefined && filterFields !== undefined;

    const { state, setState, page, setPage, hasFieldParams } = useEntityFilterParams(fields);
    const status = state.values[STATUS_KEY];
    const { data, isPending, isFetching, error } = useCrmMembers(
        {
            page,
            limit: PAGE_SIZE,
            q: state.q,
            statusItemId: typeof status === "string" ? status : undefined,
            conditions: toFieldConditions(state, fields, [STATUS_KEY]),
        },
        // a link with field conditions waits for the fields instead of loading everyone first
        { enabled: isMetaReady || !hasFieldParams }
    );

    // The "awaiting consent" badge travels with the name: table column and card title alike
    const withConsentBadge = (member: CrmMemberListItem, name: string) =>
        member.consentStatus === "pending" ? (
            <span className="inline-flex flex-wrap items-center gap-2">
                {name}
                <span
                    data-slot="badge"
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-normal text-amber-700"
                >
                    {t("consent.pending")}
                </span>
            </span>
        ) : (
            name
        );

    const tableColumns = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (member: CrmMemberListItem) =>
                withConsentBadge(member, `${member.name} ${member.surname ?? ""}`),
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
                    <EntityLink kind="member" id={member.id}>
                        {t("openProfile")}
                    </EntityLink>
                </Button>
            ),
        },
    ] as EntityListTableColumn<CrmMemberListItem>[];

    return (
        <EntityList<CrmMemberListItem>
            items={data?.items ?? []}
            loading={isPending}
            error={error ? t("loadError") : undefined}
            emptyState={
                <p className="text-muted-foreground py-8 text-center text-sm">{t("empty")}</p>
            }
            filterSlot={
                <EntityFilter
                    fields={fields}
                    state={state}
                    onChange={setState}
                    total={data?.total}
                    isFetching={isFetching}
                    storageKey="crm-members"
                    searchPlaceholder={t("searchPlaceholder")}
                />
            }
            getRowKey={(member) => member.id}
            tableColumns={tableColumns}
            isRowClickable={true}
            onRowClick={(member) => openEntity({ kind: "member", id: member.id })}
            // a card opens by itself: no «Open profile» row in it
            cardTitle={(member) =>
                withConsentBadge(
                    member,
                    `${member.name} ${member.surname ?? ""}`.trim() || member.email
                )
            }
            defaultVisibleCardFieldKeys={["email", "phone", "status"]}
            isCardClickable
            onCardClick={(member) => openEntity({ kind: "member", id: member.id })}
            pagination={{
                page,
                totalPages: data?.totalPages ?? 1,
                totalCount: data?.total,
                onPageChange: setPage,
            }}
        />
    );
}

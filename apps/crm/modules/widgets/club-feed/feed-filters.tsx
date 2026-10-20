"use client";

import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { type Permission, usePermissions } from "@/modules/entities/access";
import { FEED_GROUPS, type FeedFilter, type FeedGroup } from "@/modules/entities/timeline";

/** Раздел без права раздела в ленте пуст — его чип не показываем. */
const GROUP_PERMISSION: Partial<Record<FeedGroup, Permission>> = {
    order: "orders.read",
    member: "members.read",
    presence: "presence.read",
    employee: "employees.read",
    finance: "finance.read",
};

/** Чипы разделов ленты и «только мои»; ничего не выбрано — всё. */
export function FeedFilters({
    filter,
    onChange,
}: {
    filter: FeedFilter;
    onChange: (next: FeedFilter) => void;
}) {
    const t = useTranslations("crm.feed.filters");
    const { can } = usePermissions();
    const groups = FEED_GROUPS.filter((group) => {
        const permission = GROUP_PERMISSION[group];
        return !permission || can(permission);
    });
    const toggle = (group: FeedGroup) =>
        onChange({
            ...filter,
            groups: filter.groups.includes(group)
                ? filter.groups.filter((value) => value !== group)
                : [...filter.groups, group],
        });
    const chip = (key: string, label: string, active: boolean, onClick: () => void) => (
        <Button
            key={key}
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className="rounded-full"
            aria-pressed={active}
            onClick={onClick}
        >
            {label}
        </Button>
    );

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {chip("all", t("all"), filter.groups.length === 0, () =>
                onChange({ ...filter, groups: [] })
            )}
            {groups.map((group) =>
                chip(group, t(group), filter.groups.includes(group), () => toggle(group))
            )}
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            {chip("mine", t("mine"), filter.mine, () =>
                onChange({ ...filter, mine: !filter.mine })
            )}
        </div>
    );
}

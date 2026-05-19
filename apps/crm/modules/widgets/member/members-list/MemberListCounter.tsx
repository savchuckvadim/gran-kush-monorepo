"use client";

import { useTranslations } from "next-intl";

import { type CrmMemberListFilters, useCrmMembers } from "@/modules/entities/member";

export function MemberListCounter({ filters }: { filters?: CrmMemberListFilters }) {
    const t = useTranslations("crm.members");
    const { data: members, isLoading, error } = useCrmMembers(100, filters);

    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error.message}</div>;
    }
    if (!members) {
        return null;
    }

    return (
        <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            {t("total", { count: members.length ?? 0 })}
        </span>
    );
}

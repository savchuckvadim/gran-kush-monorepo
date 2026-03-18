"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { useCrmMembers } from "@/modules/entities/member";

export function MemberList({ locale }: { locale: string }) {
    const t = useTranslations("crm.members");
    const { data: members, isLoading, error } = useCrmMembers();

    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error.message}</div>;
    }
    if (!members) {
        return <div>No members found</div>;
    }

    return (
        <div className="overflow-hidden rounded-lg border bg-background">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
                        <th className="px-4 py-3 font-medium">{t("columns.email")}</th>
                        <th className="px-4 py-3 font-medium">{t("columns.phone")}</th>
                        <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
                        <th className="px-4 py-3 font-medium text-right">{t("columns.action")}</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((member) => (
                        <tr key={member.id} className="border-t">
                            <td className="px-4 py-3">
                                {member.name} {member.surname ?? ""}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {member.phone ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                                <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                                    {member.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/${locale}/crm/members/${member.id}`}>
                                        {t("openProfile")}
                                    </Link>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LayoutGrid, Table2 } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useCrmMembers } from "@/modules/entities/member";

export function MemberList({ locale }: { locale: string }) {
    const t = useTranslations("crm.members");
    const { data: members, isLoading, error } = useCrmMembers();
    const [mode, setMode] = useState<"table" | "cards">("table");

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
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                    <button
                        type="button"
                        onClick={() => setMode("table")}
                        className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                            mode === "table"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Table2 className="h-3.5 w-3.5" />
                        {t("viewModeTable")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("cards")}
                        className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                            mode === "cards"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {t("viewModeCards")}
                    </button>
                </div>
            </div>

            {mode === "table" ? (
                <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead className="bg-muted/50">
                                <tr className="text-left">
                                    <th className="px-3 py-2.5 font-medium">{t("columns.name")}</th>
                                    <th className="px-3 py-2.5 font-medium">{t("columns.email")}</th>
                                    <th className="hidden px-3 py-2.5 font-medium md:table-cell">{t("columns.phone")}</th>
                                    <th className="px-3 py-2.5 font-medium">{t("columns.status")}</th>
                                    <th className="px-3 py-2.5 font-medium text-right">{t("columns.action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id} className="border-t">
                                        <td className="px-3 py-2.5 max-w-[180px] truncate">
                                            {member.name} {member.surname ?? ""}
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground max-w-[220px] truncate">
                                            {member.email}
                                        </td>
                                        <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">
                                            {member.phone ?? "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
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
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => (
                        <div key={member.id} className="rounded-lg border bg-background p-4">
                            <div className="space-y-1">
                                <h3 className="font-medium leading-tight">
                                    {member.name} {member.surname ?? ""}
                                </h3>
                                <p className="text-sm text-muted-foreground break-all">{member.email}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("columns.phone")}: {member.phone ?? "—"}
                                </p>
                                <span className="inline-flex rounded-md border px-2 py-1 text-xs text-muted-foreground">
                                    {member.status}
                                </span>
                            </div>
                            <div className="mt-3">
                                <Button variant="outline" size="sm" asChild className="w-full">
                                    <Link href={`/${locale}/crm/members/${member.id}`}>
                                        {t("openProfile")}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import {
    buildJoinUrl,
    type RegistrationLink,
    type RegistrationLinkStatus,
    useRegistrationLinks,
    useRevokeRegistrationLink,
    useUpdateRegistrationLink,
} from "@/modules/entities/registration-links";

import { LinkUrlField } from "./link-url-field";

const PAGE_SIZE = 10;
const FILTERS: (RegistrationLinkStatus | "all")[] = [
    "all",
    "ready",
    "exhausted",
    "expired",
    "disabled",
    "revoked",
];

const STATUS_TONE: Record<RegistrationLinkStatus, string> = {
    ready: "bg-success/15 text-success-text",
    exhausted: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
    disabled: "bg-warning/15 text-warning-text",
    revoked: "bg-destructive/10 text-destructive-text",
};

function StatusBadge({ status }: { status: RegistrationLinkStatus }) {
    const t = useTranslations("crm.registrationLinks.statuses");
    return (
        <span
            data-slot="badge"
            className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[status])}
        >
            {t(status)}
        </span>
    );
}

function LinkRow({ link }: { link: RegistrationLink }) {
    const t = useTranslations("crm.registrationLinks");
    const locale = useLocale();
    const format = useFormatter();
    const revoke = useRevokeRegistrationLink();
    const update = useUpdateRegistrationLink();
    const [confirming, setConfirming] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const askRevoke = () => {
        if (!confirming) {
            setConfirming(true);
            window.setTimeout(() => setConfirming(false), 3000);
            return;
        }
        setConfirming(false);
        revoke.mutate(link.id, { onSuccess: () => toast.success(t("actions.revoked")) });
    };

    const date = (iso: string) =>
        format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

    return (
        <li className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                >
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{link.name}</span>
                        <StatusBadge status={link.status} />
                        <span className="text-muted-foreground text-xs">
                            {t(`kinds.${link.kind}`)}
                        </span>
                    </span>
                    <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                        <span>
                            {link.maxUses
                                ? t("row.uses", { used: link.usesCount, max: link.maxUses })
                                : t("row.usesUnlimited", { used: link.usesCount })}
                        </span>
                        {link.online > 0 && (
                            <span className="text-foreground inline-flex items-center gap-1 font-medium">
                                <Eye className="size-3" aria-hidden="true" />
                                {t("row.online", { count: link.online })}
                            </span>
                        )}
                        {link.hasPrefill && <span>{t("row.prefill")}</span>}
                        {link.createdBy && (
                            <span>{t("row.createdBy", { email: link.createdBy.email })}</span>
                        )}
                        <span>{date(link.createdAt)}</span>
                        {link.expiresAt && link.status === "ready" && (
                            <span>{t("row.expiresAt", { date: date(link.expiresAt) })}</span>
                        )}
                    </span>
                </button>

                {link.status !== "revoked" && (
                    <div className="flex shrink-0 items-center gap-1">
                        {(link.status === "ready" || link.status === "disabled") && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={update.isPending}
                                onClick={() =>
                                    update.mutate({
                                        id: link.id,
                                        body: { isActive: link.status !== "ready" },
                                    })
                                }
                            >
                                {link.status === "ready"
                                    ? t("actions.disable")
                                    : t("actions.enable")}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant={confirming ? "destructive" : "ghost"}
                            size="sm"
                            disabled={revoke.isPending}
                            onClick={askRevoke}
                        >
                            {confirming ? t("actions.revokeConfirm") : t("actions.revoke")}
                        </Button>
                    </div>
                )}
            </div>

            {expanded && link.status === "ready" && (
                <div className="mt-3">
                    <LinkUrlField url={buildJoinUrl(locale, link.token)} />
                </div>
            )}
        </li>
    );
}

/** «Выданные»: every link of the club page by page, with live viewers while it is shown. */
export function LinksList({ live = true }: { live?: boolean }) {
    const t = useTranslations("crm.registrationLinks");
    const [filter, setFilter] = useState<RegistrationLinkStatus | "all">("all");
    const [page, setPage] = useState(1);

    const query = useRegistrationLinks(
        { page, limit: PAGE_SIZE, ...(filter === "all" ? {} : { status: filter }) },
        { live }
    );
    const data = query.data;
    const totalPages = Math.max(1, data?.totalPages ?? 1);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="tablist">
                {FILTERS.map((value) => (
                    <Button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={filter === value}
                        size="sm"
                        variant={filter === value ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => {
                            setFilter(value);
                            setPage(1);
                        }}
                    >
                        {t(`filters.${value}`)}
                    </Button>
                ))}
            </div>

            {query.isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
            ) : !data || data.links.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">{t("empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {data.links.map((link) => (
                        <LinkRow key={link.id} link={link} />
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("pager.prev")}
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                        <ChevronLeft />
                    </Button>
                    <span className="text-muted-foreground tabular-nums">
                        {t("pager.page", { page, total: totalPages })}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("pager.next")}
                        disabled={page >= totalPages}
                        onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    >
                        <ChevronRight />
                    </Button>
                </div>
            )}
        </div>
    );
}

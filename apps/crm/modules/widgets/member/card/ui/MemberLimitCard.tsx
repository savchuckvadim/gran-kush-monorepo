"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui/components/card";

import { useMemberLimit } from "@/modules/entities/member-limit";
import { usePortalRole } from "@/modules/entities/portal";

import { MemberLimitForm } from "./MemberLimitForm";

/**
 * Лимит отпуска участнику за последние 30 дней. Виден, только когда клуб включил лимиты;
 * личный лимит меняет manager+, остальные видят расход.
 */
export function MemberLimitCard({ memberId }: { memberId: string }) {
    const t = useTranslations("crm.members.card.limit");
    const { isManager } = usePortalRole();
    const limit = useMemberLimit(memberId);

    if (!limit.data?.enabled) return null;
    const { usedGrams, limitGrams, remainingGrams, personalGrams } = limit.data;
    const share = limitGrams ? Math.min(100, (usedGrams / limitGrams) * 100) : 0;

    return (
        <Card className="gap-3 px-4 md:px-5">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            {limitGrams === null ? (
                <p className="text-sm text-muted-foreground">{t("noLimit", { used: usedGrams })}</p>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm">
                        {t("used", { used: usedGrams, limit: limitGrams })}
                        <span className="text-muted-foreground">
                            {" · "}
                            {t("remaining", { remaining: remainingGrams ?? 0 })}
                        </span>
                    </p>
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={limitGrams}
                        aria-valuenow={usedGrams}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                    >
                        <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                {personalGrams === null ? t("clubDefault") : t("personal")}
            </p>
            {isManager && <MemberLimitForm memberId={memberId} personalGrams={personalGrams} />}
        </Card>
    );
}

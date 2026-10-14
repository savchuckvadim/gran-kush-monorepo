"use client";

import { useTranslations } from "next-intl";

import { DoorOpen } from "lucide-react";

import { Card } from "@workspace/ui/components/card";

import type { MemberVisit } from "../model/member-card.types";

import { MemberTabEmpty } from "./MemberTabEmpty";
import { MemberVisitRow } from "./MemberVisitRow";

export function MemberVisitsTab({ visits }: { visits: readonly MemberVisit[] }) {
    const t = useTranslations("crm.members.card.visits");

    if (visits.length === 0) {
        return <MemberTabEmpty icon={<DoorOpen aria-hidden="true" />} text={t("empty")} />;
    }
    return (
        <Card className="gap-0 py-1">
            <ul className="divide-y divide-border/60">
                {visits.map((visit) => (
                    <MemberVisitRow key={visit.id} visit={visit} />
                ))}
            </ul>
        </Card>
    );
}

"use client";

import { useMemberDetails } from "@/modules/entities/member";

import type { MemberCardProps } from "../model/member-card.types";

import { MemberCardContent } from "./MemberCardContent";
import { MemberCardSkeleton } from "./MemberCardSkeleton";
import { MemberCardState } from "./MemberCardState";

/** The member's card: on its own page and in a slider over another page. */
export function MemberCard({ memberId, layout = "page" }: MemberCardProps) {
    const { data: member, isLoading, error, refetch } = useMemberDetails(memberId);

    if (isLoading) return <MemberCardSkeleton />;
    if (error) return <MemberCardState kind="error" onRetry={() => void refetch()} />;
    if (!member) return <MemberCardState kind="not-found" />;
    return <MemberCardContent member={member} layout={layout} />;
}

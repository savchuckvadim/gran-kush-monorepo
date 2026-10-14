"use client";

import type { CrmMemberDetails } from "@/modules/entities/member";

import { useMemberCardData } from "../hooks/use-member-card-data";
import type { MemberCardLayout } from "../model/member-card.types";

import { MemberBackLink } from "./MemberBackLink";
import { MemberCardTabs } from "./MemberCardTabs";
import { MemberHero } from "./MemberHero";
import { MemberStats } from "./MemberStats";

interface MemberCardContentProps {
    member: CrmMemberDetails;
    layout: MemberCardLayout;
}

export function MemberCardContent({ member, layout }: MemberCardContentProps) {
    const { data, stats } = useMemberCardData(member);

    return (
        <div data-slot="member-card" data-layout={layout} className="flex flex-col gap-4">
            {layout === "page" && <MemberBackLink />}
            <MemberHero member={member} inClubNow={stats.inClubNow} />
            <MemberStats member={member} stats={stats} />
            <MemberCardTabs data={data} />
        </div>
    );
}

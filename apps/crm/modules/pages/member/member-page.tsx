"use client";

import { MemberCard } from "@/modules/widgets/member";

export interface IMemberPageProps {
    memberId: string;
    locale: string;
}

/** The member's own page: the same card a slider shows, with a way back to the list. */
export function MemberPage({ memberId }: IMemberPageProps) {
    return <MemberCard memberId={memberId} layout="page" />;
}

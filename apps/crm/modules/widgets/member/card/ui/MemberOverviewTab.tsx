import type { MemberCardData } from "../model/member-card.types";

import { MemberLimitCard } from "./MemberLimitCard";
import { MemberProfilePanel } from "./MemberProfilePanel";
import { MemberTimeline } from "./MemberTimeline";

/** The profile on the left, the history with team comments on the right — as a Bitrix24 card. */
export function MemberOverviewTab({ data }: { data: MemberCardData }) {
    return (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="grid gap-4">
                <MemberProfilePanel member={data.member} />
                <MemberLimitCard memberId={data.member.id} />
            </div>
            <MemberTimeline data={data} />
        </div>
    );
}

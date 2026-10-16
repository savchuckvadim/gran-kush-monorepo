import type { MemberCardData } from "../model/member-card.types";

import { MemberActivityFeed } from "./MemberActivityFeed";
import { MemberLimitCard } from "./MemberLimitCard";
import { MemberProfilePanel } from "./MemberProfilePanel";

/** The profile on the left, everything that happened on the right — as a Bitrix24 card. */
export function MemberOverviewTab({ data }: { data: MemberCardData }) {
    return (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="grid gap-4">
                <MemberProfilePanel member={data.member} />
                <MemberLimitCard memberId={data.member.id} />
            </div>
            <MemberActivityFeed data={data} />
        </div>
    );
}

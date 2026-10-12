"use client";

import { CreateMemberForm, PersonalLinkButton } from "@/modules/features";

/** New member form with the «finish it yourself» link: what is typed goes into a personal link. */
export function MemberCreate() {
    return (
        <CreateMemberForm
            renderDraftAction={(draft) => (
                <PersonalLinkButton email={draft.email} fields={draft.fields} who={draft.who} />
            )}
        />
    );
}

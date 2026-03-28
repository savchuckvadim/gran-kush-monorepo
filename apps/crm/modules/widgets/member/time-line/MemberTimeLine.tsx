import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";

import { MemberTimelineNote } from "./components/MemberTimelineNote";
import { fakeDataNotes } from "./fake-data-notes";

export function MemberTimeLine({ member }: { member: CrmMemberDetails }) {
    const t = useTranslations("crm.members");

    return (
        <Card className="p-4 min-h-full">
            <h2 className="mb-3 text-base font-medium">{t("notesTitle")}</h2>
            <ul className="space-y-2">
                {fakeDataNotes.map((note) => (
                    <MemberTimelineNote
                        key={note.id}
                        id={note.id}
                        title={note.title}
                        note={note.note}
                        createdAt={note.createdAt}
                    />
                ))}
            </ul>
        </Card>
    );
}

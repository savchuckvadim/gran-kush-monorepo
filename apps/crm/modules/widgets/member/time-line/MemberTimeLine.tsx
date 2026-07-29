import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";

import { MemberTimelineNote } from "./components/MemberTimelineNote";

export function MemberTimeLine({ member }: { member: CrmMemberDetails }) {
    const t = useTranslations("crm.members");
    const notes = member.notes
        ? [
              {
                  id: member.id,
                  title: t("notesTitle"),
                  note: member.notes,
                  createdAt: new Date(member.updatedAt),
              },
          ]
        : [];

    return (
        <Card className="p-4 min-h-full">
            <h2 className="mb-3 text-base font-medium">{t("notesTitle")}</h2>
            {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
            ) : (
                <ul className="space-y-2">
                    {notes.map((note) => (
                        <MemberTimelineNote
                            key={note.id}
                            id={note.id}
                            title={note.title}
                            note={note.note}
                            createdAt={note.createdAt}
                        />
                    ))}
                </ul>
            )}
        </Card>
    );
}

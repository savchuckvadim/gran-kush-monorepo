export interface IMemberTimelineNote {
    id: string;
    title?: string;
    note: string;
    createdAt: Date;
}
export function MemberTimelineNote({ id, title, note, createdAt }: IMemberTimelineNote) {
    return (
        <li className="flex items-center gap-2" key={id}>
            <span className="text-sm text-muted-foreground">{createdAt.toLocaleDateString()}</span>
            <span className="text-sm font-medium">{title ?? "-"}</span>
            <span className="text-sm text-muted-foreground">{note}</span>
        </li>
    );
}

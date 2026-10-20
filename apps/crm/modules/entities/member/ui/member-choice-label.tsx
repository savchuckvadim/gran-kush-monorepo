interface MemberChoiceLabelProps {
    name: string;
    email?: string | null;
    className?: string;
}

/** Имя и почта участника в одну строку; без имени — одна почта. */
export function MemberChoiceLabel({ name, email, className }: MemberChoiceLabelProps) {
    return (
        <span className={className}>
            <span className="truncate">{name || email}</span>
            {name && email && (
                <span className="truncate text-xs text-muted-foreground">{email}</span>
            )}
        </span>
    );
}

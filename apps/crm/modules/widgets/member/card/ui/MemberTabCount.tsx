/** The small number next to a tab title; nothing for zero. */
export function MemberTabCount({ value }: { value: number }) {
    if (value === 0) return null;
    return (
        <span className="rounded-full bg-foreground/10 px-1.5 text-[0.6875rem] leading-4 tabular-nums">
            {value}
        </span>
    );
}

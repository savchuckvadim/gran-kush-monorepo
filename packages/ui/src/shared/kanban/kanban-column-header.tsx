import type { ReactNode } from "react";

export interface KanbanColumnHeaderProps {
    title: string;
    color: string;
    count?: number;
    /** Под названием: сумма колонки */
    aside?: ReactNode;
    /** Доля колонки в доске, 0–1: полоска под шапкой. Без неё полоски нет */
    share?: number;
}

/**
 * Шапка колонки: крупный счётчик шрифтом скина, название со стадийной точкой, сумма и полоска
 * доли. Цвет держат цифра и полоска, а не заливка, поэтому стена колонок не пестрит.
 */
export function KanbanColumnHeader({ title, color, count, aside, share }: KanbanColumnHeaderProps) {
    return (
        <header data-slot="kanban-column-header" className="flex flex-col gap-2 px-1 pt-0.5">
            <div className="flex items-end gap-3">
                {count !== undefined && (
                    <span
                        className="text-[2.25rem] leading-[0.85] font-extrabold tracking-tight tabular-nums"
                        style={{ color, fontFamily: "var(--font-display)" }}
                    >
                        {count}
                    </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-0.5">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
                        <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{title}</span>
                    </span>
                    {aside}
                </div>
            </div>
            {share !== undefined && (
                <span
                    aria-hidden="true"
                    className="bg-foreground/10 block h-1.5 overflow-hidden rounded-full"
                >
                    <span
                        className="block h-full rounded-full"
                        style={{
                            width: `${share > 0 ? Math.max(Math.round(share * 100), 6) : 0}%`,
                            backgroundColor: color,
                        }}
                    />
                </span>
            )}
        </header>
    );
}

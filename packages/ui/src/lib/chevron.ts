/** Высоты полосы стадий и шапок канбана. `sm` — по умолчанию: тонкая лента. */
export type ChevronSize = "sm" | "md" | "lg";

const HEIGHT: Readonly<Record<ChevronSize, number>> = { sm: 26, md: 34, lg: 44 };

/** Острие шеврона — четверть высоты: при любой высоте угол остаётся тем же. */
const notchOf = (size: ChevronSize): number => Math.round(HEIGHT[size] / 4);

/** Высота полосы в пикселях — ею же меряются шрифт и отступы. */
export const chevronHeight = (size: ChevronSize): number => HEIGHT[size];

/**
 * Chevron outline for stage steps and kanban column headers: an arrow point on the right and,
 * except for the first step, a notch on the left that the previous point fits into. The point
 * scales with the height, so a thin bar gets a short point rather than a stretched one.
 */
export const chevronClipPath = (first: boolean, size: ChevronSize = "sm"): string => {
    const notch = `${notchOf(size)}px`;
    return first
        ? `polygon(0 0, calc(100% - ${notch}) 0, 100% 50%, calc(100% - ${notch}) 100%, 0 100%)`
        : `polygon(0 0, calc(100% - ${notch}) 0, 100% 50%, calc(100% - ${notch}) 100%, 0 100%, ${notch} 50%)`;
};

/** Отступы шага: слева — место под въевшееся острие предыдущего. */
export const chevronPadding = (first: boolean, size: ChevronSize): string => {
    const notch = notchOf(size);
    return `0 ${notch + 6}px 0 ${first ? notch + 6 : notch * 2 + 6}px`;
};

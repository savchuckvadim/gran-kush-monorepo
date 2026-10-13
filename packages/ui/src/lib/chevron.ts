const NOTCH = "0.625rem";

/**
 * Chevron outline for stage steps and kanban column headers: an arrow point on the right and,
 * except for the first step, a notch on the left that the previous point fits into.
 */
export const chevronClipPath = (first: boolean): string =>
    first
        ? `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%)`
        : `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%, ${NOTCH} 50%)`;

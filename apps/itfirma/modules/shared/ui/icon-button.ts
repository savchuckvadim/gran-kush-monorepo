/**
 * Round icon button of the header: mode, palette, language and the burger share one look. Inside a
 * glass bar the `.glass .icon-btn` rule drops its own frame, the bar is the frame (globals.css).
 */
export const ICON_BUTTON =
    "icon-btn inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-border bg-card/60 px-2 text-foreground transition-colors hover:bg-accent";

/** Panel under a header button; `surface` lives in the components layer, so `absolute` wins. */
export const HEADER_POPOVER = "surface absolute top-full right-0 z-40 mt-2";

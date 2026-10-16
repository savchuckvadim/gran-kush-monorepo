/** Swatch of the current theme's colours: the "themes" button looks like the theme itself. */
export function SkinSwatch() {
    return (
        <span
            aria-hidden="true"
            className="size-[1.125rem] rounded-full ring-1 ring-border"
            style={{
                background:
                    "conic-gradient(from 200deg, var(--primary), var(--chart-2, var(--accent)), var(--chart-4, var(--secondary)), var(--primary))",
            }}
        />
    );
}

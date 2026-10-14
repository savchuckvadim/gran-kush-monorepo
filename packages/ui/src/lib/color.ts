const HEX_COLOR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#141418";

type Rgb = readonly [number, number, number];

const parseHex = (color: string): Rgb | null => {
    const match = HEX_COLOR.exec(color.trim());
    if (!match?.[1]) return null;
    const digits =
        match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
    const value = Number.parseInt(digits, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** WCAG relative luminance of an sRGB colour. */
const luminance = ([r, g, b]: Rgb): number => {
    const linear = (channel: number) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

const DARK_LUMINANCE = luminance(parseHex(DARK_TEXT) ?? [0, 0, 0]);

/**
 * Text colour for a filled background (a stage chevron, a column header): whichever of white
 * and near-black contrasts more. Not a hex colour — white, the safe choice on unknown fills.
 */
export function readableTextColor(background: string): string {
    const rgb = parseHex(background);
    if (!rgb) return LIGHT_TEXT;
    const fill = luminance(rgb);
    const onWhite = 1.05 / (fill + 0.05);
    const onDark = (fill + 0.05) / (DARK_LUMINANCE + 0.05);
    return onWhite >= onDark ? LIGHT_TEXT : DARK_TEXT;
}

/** A stable hue (0–359) for a text: the same person keeps the same colour across the app. */
export const hueOf = (text: string): number => {
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash % 360;
};

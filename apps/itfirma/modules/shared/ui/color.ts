export type Rgb = readonly [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;

/**
 * Reads a CSS colour the way the skin tokens write them: `#rgb`, `#rrggbb` or `rgb(r g b / a)`.
 * Anything else, including `color-mix(...)`, yields the fallback.
 */
export const parseCssColor = (value: string, fallback: Rgb): Rgb => {
    const text = value.trim();
    const hex = HEX.exec(text);
    if (hex?.[1]) {
        const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
        return [
            parseInt(digits.slice(0, 2), 16),
            parseInt(digits.slice(2, 4), 16),
            parseInt(digits.slice(4, 6), 16),
        ];
    }
    const rgb = RGB.exec(text);
    if (rgb?.[1] && rgb[2] && rgb[3]) {
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    }
    return fallback;
};

export const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** 0..1 components for shader uniforms. */
export const toUnit = ([r, g, b]: Rgb): [number, number, number] => [r / 255, g / 255, b / 255];

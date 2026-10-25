"use client";

import { useEffect, useState } from "react";

import { SKIN_EVENT } from "@/modules/shared/config/skins";

import { parseCssColor, type Rgb } from "./color";

export interface SkinColors {
    primary: Rgb;
    foreground: Rgb;
    background: Rgb;
    chart: readonly [Rgb, Rgb, Rgb, Rgb];
}

const NEUTRAL: SkinColors = {
    primary: [233, 228, 218],
    foreground: [236, 236, 236],
    background: [10, 10, 10],
    chart: [
        [233, 228, 218],
        [141, 135, 125],
        [192, 22, 42],
        [74, 71, 68],
    ],
};

const read = (): SkinColors => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: Rgb) =>
        parseCssColor(style.getPropertyValue(name), fallback);
    return {
        primary: token("--primary", NEUTRAL.primary),
        foreground: token("--foreground", NEUTRAL.foreground),
        background: token("--background", NEUTRAL.background),
        chart: [
            token("--chart-1", NEUTRAL.chart[0]),
            token("--chart-2", NEUTRAL.chart[1]),
            token("--chart-3", NEUTRAL.chart[2]),
            token("--chart-4", NEUTRAL.chart[3]),
        ],
    };
};

/** The current skin's colours as numbers, for canvases; follows every switch of skin or mode. */
export const useSkinColors = (): SkinColors => {
    const [colors, setColors] = useState<SkinColors>(NEUTRAL);

    useEffect(() => {
        const sync = () => setColors(read());
        sync();
        window.addEventListener(SKIN_EVENT, sync);
        return () => window.removeEventListener(SKIN_EVENT, sync);
    }, []);

    return colors;
};

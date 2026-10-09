import {
    Comfortaa,
    Commissioner,
    Cormorant_Garamond,
    Dela_Gothic_One,
    Exo_2,
    Fira_Sans_Extra_Condensed,
    Geist,
    Geist_Mono,
    Geologica,
    IBM_Plex_Mono,
    IBM_Plex_Sans,
    JetBrains_Mono,
    Lora,
    Manrope,
    Nunito,
    Onest,
    Pirata_One,
    Rubik_Mono_One,
    Ruslan_Display,
    Unbounded,
} from "next/font/google";

import type { CSSProperties } from "react";

/*
 * Every font gets its own variable on <html>; globals.css maps --font-sans/--font-mono to Geist
 * and skins.css remaps them per skin. Skin fonts are not preloaded: the browser fetches a file
 * only when text in that skin (or its gallery preview) needs it. Onest is the exception — the
 * default skin (PafPaf) sets every screen in it, and without a preload the text would swap.
 */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const onest = Onest({
    subsets: ["latin", "cyrillic"],
    variable: "--font-onest",
    display: "swap",
});
const cormorant = Cormorant_Garamond({
    subsets: ["latin", "cyrillic"],
    weight: ["500", "600", "700"],
    variable: "--font-cormorant",
    display: "swap",
    preload: false,
});
const geologica = Geologica({
    subsets: ["latin", "cyrillic"],
    variable: "--font-geologica",
    display: "swap",
    preload: false,
});
const comfortaa = Comfortaa({
    subsets: ["latin", "cyrillic"],
    variable: "--font-comfortaa",
    display: "swap",
    preload: false,
});
const nunito = Nunito({
    subsets: ["latin", "cyrillic"],
    variable: "--font-nunito",
    display: "swap",
    preload: false,
});
const exo2 = Exo_2({
    subsets: ["latin", "cyrillic"],
    variable: "--font-exo2",
    display: "swap",
    preload: false,
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin", "cyrillic"],
    variable: "--font-jetbrains-mono",
    display: "swap",
    preload: false,
});
const plexSans = IBM_Plex_Sans({
    subsets: ["latin", "cyrillic"],
    variable: "--font-plex-sans",
    display: "swap",
    preload: false,
});
const plexMono = IBM_Plex_Mono({
    subsets: ["latin", "cyrillic"],
    weight: ["400", "500", "600"],
    variable: "--font-plex-mono",
    display: "swap",
    preload: false,
});
const commissioner = Commissioner({
    subsets: ["latin", "cyrillic"],
    variable: "--font-commissioner",
    display: "swap",
    preload: false,
});
const unbounded = Unbounded({
    subsets: ["latin", "cyrillic"],
    variable: "--font-unbounded",
    display: "swap",
    preload: false,
});
const firaCondensed = Fira_Sans_Extra_Condensed({
    subsets: ["latin", "cyrillic"],
    weight: ["500", "700"],
    variable: "--font-fira-condensed",
    display: "swap",
    preload: false,
});
const delaGothic = Dela_Gothic_One({
    subsets: ["latin", "cyrillic"],
    weight: "400",
    variable: "--font-dela-gothic",
    display: "swap",
    preload: false,
});
const rubikMono = Rubik_Mono_One({
    subsets: ["latin", "cyrillic"],
    weight: "400",
    variable: "--font-rubik-mono",
    display: "swap",
    preload: false,
});
// Latin only; Grind takes Cyrillic from Ruslan Display (see fontStyle below).
const pirata = Pirata_One({
    subsets: ["latin"],
    weight: "400",
    display: "swap",
    preload: false,
});
const ruslan = Ruslan_Display({
    subsets: ["latin", "cyrillic"],
    weight: "400",
    variable: "--font-ruslan",
    display: "swap",
    preload: false,
});
const lora = Lora({
    subsets: ["latin", "cyrillic"],
    variable: "--font-lora",
    display: "swap",
    preload: false,
});
const manrope = Manrope({
    subsets: ["latin", "cyrillic"],
    variable: "--font-manrope",
    display: "swap",
    preload: false,
});

export const fontVariables = [
    geist,
    geistMono,
    onest,
    cormorant,
    geologica,
    comfortaa,
    nunito,
    exo2,
    jetbrainsMono,
    plexSans,
    plexMono,
    commissioner,
    unbounded,
    firaCondensed,
    delaGothic,
    rubikMono,
    ruslan,
    lora,
    manrope,
]
    .map((font) => font.variable)
    .join(" ");

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

/*
 * Pirata One without its metric fallback: next/font appends an adjusted local Arial, which has
 * Cyrillic, so the stack would never reach Ruslan Display. `adjustFontFallback: false` is
 * ignored by Turbopack, hence the first family taken from the generated stack.
 */
export const fontStyle: CustomProperties = {
    "--font-pirata": pirata.style.fontFamily.split(",")[0] ?? "serif",
};

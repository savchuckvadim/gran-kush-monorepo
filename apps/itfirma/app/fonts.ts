import {
    Commissioner,
    Geist,
    IBM_Plex_Mono,
    IBM_Plex_Sans,
    Nunito,
    Playfair_Display,
} from "next/font/google";

// One variable per skin font; globals.css maps them to --font-sans / --font-display per skin.
const plexSans = IBM_Plex_Sans({
    subsets: ["latin", "cyrillic"],
    weight: ["400", "500", "600"],
    variable: "--font-plex-sans",
    display: "swap",
});

const plexMono = IBM_Plex_Mono({
    subsets: ["latin", "cyrillic"],
    weight: ["400", "500"],
    variable: "--font-plex-mono",
    display: "swap",
});

const commissioner = Commissioner({
    subsets: ["latin", "cyrillic"],
    variable: "--font-commissioner",
    display: "swap",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const nunito = Nunito({
    subsets: ["latin", "cyrillic"],
    variable: "--font-nunito",
    display: "swap",
});

const playfair = Playfair_Display({
    subsets: ["latin", "cyrillic"],
    variable: "--font-playfair",
    display: "swap",
});

export const FONT_CLASS_NAME = [plexSans, plexMono, commissioner, geist, nunito, playfair]
    .map((font) => font.variable)
    .join(" ");

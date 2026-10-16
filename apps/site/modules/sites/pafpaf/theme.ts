import { Onest } from "next/font/google";

import { MODE_SCRIPT } from "./ui/mode";

import "./liquid.css";

const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });

export const theme = {
    htmlClassName: onest.variable,
    defaultMode: "dark",
    modeScript: MODE_SCRIPT,
} as const;

export { RenderBlocks } from "./blocks/render-blocks";
export { SiteFrame } from "./frame";
export { SmokeToggle } from "./ui/switches";

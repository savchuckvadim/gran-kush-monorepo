import { Cormorant_Garamond, Geologica } from "next/font/google";

import "./nagual.css";

const display = Cormorant_Garamond({
    subsets: ["latin", "cyrillic"],
    weight: ["500", "600", "700"],
    variable: "--font-cormorant",
    display: "swap",
});
const body = Geologica({
    subsets: ["latin", "cyrillic"],
    variable: "--font-geologica",
    display: "swap",
});

export const theme = {
    htmlClassName: `${display.variable} ${body.variable}`,
    defaultMode: "dark",
    modeScript: `(function(){try{var m=localStorage.getItem("nagual.mode");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}})();`,
} as const;

export { SiteFrame } from "./frame";
export { RenderBlocks } from "./render-blocks";

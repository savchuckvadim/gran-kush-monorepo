import { domainsOf } from "../installations";
import type { BrandConfig } from "../types";

/** Tattoo studios. */
export const inkspace: BrandConfig = {
    code: "inkspace",
    name: "Ink Space",
    cabinetName: "Ink Space",
    wordmark: "ink space",
    portalType: "TATTOO_STUDIO",
    modules: ["billing"],
    defaultSkin: "black",
    hiddenSkins: ["pafpaf"],
    skinLettering: null,
    palette: ["#4f46e5", "#0ea5e9", "#22d3ee"],
    mark: {
        iconViewBox: "3 1.5 19 19",
        // a drop of ink and a splash
        shapes: [
            {
                kind: "path",
                d: "M11 3.2c3.7 4.5 6.4 8 6.4 11.2a6.4 6.4 0 0 1-12.8 0c0-3.2 2.7-6.7 6.4-11.2Z",
            },
            { kind: "circle", cx: 18.6, cy: 5.6, r: 1.9, opacity: 0.82 },
        ],
    },
    domains: domainsOf("inkspace"),
};

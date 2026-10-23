import { domainsOf } from "../installations";
import type { BrandConfig } from "../types";

/** Beauty studios. */
export const plisplas: BrandConfig = {
    code: "plisplas",
    name: "Plis Plas",
    cabinetName: "Plis Plas",
    wordmark: "plis plas",
    portalType: "BEAUTY_STUDIO",
    modules: ["billing"],
    defaultSkin: "coqueta",
    hiddenSkins: ["pafpaf"],
    skinLettering: null,
    palette: ["#ff4fa3", "#ff7eb9", "#ffb3d6"],
    mark: {
        iconViewBox: "2 2 20 20",
        // a sparkle and a dot
        shapes: [
            {
                kind: "path",
                d: "M10.5 3.5l1.9 6.1 6.1 1.9-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.9Z",
            },
            { kind: "circle", cx: 18.2, cy: 17.6, r: 2.2, opacity: 0.82 },
        ],
    },
    domains: domainsOf("plisplas"),
};

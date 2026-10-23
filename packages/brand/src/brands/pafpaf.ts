import { domainsOf } from "../installations";
import type { BrandConfig } from "../types";

/** Clubs. Free for now (TASK-790): no `billing`, so no 402 gate and no plans in the CRM. */
export const pafpaf: BrandConfig = {
    code: "pafpaf",
    name: "PafPaf",
    cabinetName: "PafPaf Club",
    wordmark: "paf paf",
    portalType: "CLUB",
    modules: ["presence", "club-policy"],
    defaultSkin: "pafpaf",
    hiddenSkins: [],
    skinLettering: "/brand/lettering-blackmetal.svg",
    palette: ["#7b61ff", "#ff5fa2", "#ffb340"],
    mark: {
        iconViewBox: "1.75 1.8 20 20",
        // the two puffs of the product site logo
        shapes: [
            { kind: "circle", cx: 9, cy: 13.5, r: 6.4 },
            { kind: "circle", cx: 16.6, cy: 8, r: 4.3, opacity: 0.82 },
        ],
    },
    domains: domainsOf("pafpaf"),
};

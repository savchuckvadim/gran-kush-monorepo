import type { SiteCode } from "./site";

/** A section of the home page the menu links to: its anchor and the `nav.<label>` message. */
export interface HomeSection {
    id: string;
    anchor: string;
    label: "features" | "privacy" | "soon";
}

/**
 * The menu follows each site's home: its starter content (payload/seed) has these anchors.
 * An editor who removes a section in the CMS removes it here too.
 */
export const HOME_SECTIONS: Record<SiteCode, readonly HomeSection[]> = {
    pafpaf: [
        { id: "features", anchor: "funciones", label: "features" },
        { id: "privacy", anchor: "privacidad", label: "privacy" },
    ],
    inkspace: [
        { id: "features", anchor: "funciones", label: "features" },
        { id: "soon", anchor: "pronto", label: "soon" },
    ],
    plisplas: [],
};

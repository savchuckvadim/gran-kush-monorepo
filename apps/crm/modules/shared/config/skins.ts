/**
 * CRM skins. Tokens and effects live in packages/ui/src/styles/skins.css; texts live in the
 * `crm.appearance` messages (`skins.<id>.name`, `skins.<id>.description`, `tags.<tag>`).
 */

export const SKIN_IDS = [
    "clasico",
    "pafpaf",
    "nagual",
    "unicornio",
    "galaxia",
    "asceta",
    "cristal",
    "vapor",
    "brasa",
    "trap",
    "noventa",
    "grind",
    "mediterraneo",
] as const;

export type SkinId = (typeof SKIN_IDS)[number];
export type SkinMode = "light" | "dark";
export type SkinTag = "calm" | "motion" | "bg" | "events" | "glass" | "oled" | "type";

export interface SkinDefinition {
    id: SkinId;
    /** First mode is the skin's own; a skin with one mode forces it. */
    modes: readonly [SkinMode] | readonly [SkinMode, SkinMode];
    tags: readonly SkinTag[];
    /** Energy saving is always on (Asceta). */
    forcesEco: boolean;
    /** Has its own names for light/dark in `skins.<id>.modes`. */
    hasModeNames: boolean;
}

/** Clásico: the tokens in globals.css, rendered without a data-skin attribute. */
export const BASE_SKIN: SkinId = "clasico";

/** What an account sees until it picks a skin. */
export const DEFAULT_SKIN: SkinId = "pafpaf";

const BOTH: readonly [SkinMode, SkinMode] = ["light", "dark"];
const DARK_FIRST: readonly [SkinMode, SkinMode] = ["dark", "light"];
const LIGHT_ONLY: readonly [SkinMode] = ["light"];
const DARK_ONLY: readonly [SkinMode] = ["dark"];

const SKIN_MAP: Record<SkinId, SkinDefinition> = {
    clasico: { id: "clasico", modes: BOTH, tags: ["calm"], forcesEco: false, hasModeNames: false },
    pafpaf: { id: "pafpaf", modes: BOTH, tags: ["motion"], forcesEco: false, hasModeNames: false },
    nagual: {
        id: "nagual",
        modes: DARK_FIRST,
        tags: ["bg", "events"],
        forcesEco: false,
        hasModeNames: false,
    },
    unicornio: {
        id: "unicornio",
        modes: LIGHT_ONLY,
        tags: ["glass", "motion", "events"],
        forcesEco: false,
        hasModeNames: false,
    },
    galaxia: {
        id: "galaxia",
        modes: DARK_FIRST,
        tags: ["bg", "motion"],
        forcesEco: false,
        hasModeNames: true,
    },
    asceta: {
        id: "asceta",
        modes: DARK_ONLY,
        tags: ["oled", "calm"],
        forcesEco: true,
        hasModeNames: false,
    },
    cristal: {
        id: "cristal",
        modes: BOTH,
        tags: ["glass", "bg"],
        forcesEco: false,
        hasModeNames: false,
    },
    vapor: {
        id: "vapor",
        modes: LIGHT_ONLY,
        tags: ["bg", "motion"],
        forcesEco: false,
        hasModeNames: false,
    },
    brasa: {
        id: "brasa",
        modes: DARK_ONLY,
        tags: ["bg", "motion"],
        forcesEco: false,
        hasModeNames: false,
    },
    trap: { id: "trap", modes: DARK_ONLY, tags: ["type"], forcesEco: false, hasModeNames: false },
    noventa: {
        id: "noventa",
        modes: LIGHT_ONLY,
        tags: ["type", "events"],
        forcesEco: false,
        hasModeNames: false,
    },
    grind: {
        id: "grind",
        modes: DARK_ONLY,
        tags: ["type", "events"],
        forcesEco: false,
        hasModeNames: false,
    },
    mediterraneo: {
        id: "mediterraneo",
        modes: BOTH,
        tags: ["calm"],
        forcesEco: false,
        hasModeNames: true,
    },
};

export const SKINS: readonly SkinDefinition[] = SKIN_IDS.map((id) => SKIN_MAP[id]);

export const getSkin = (id: SkinId): SkinDefinition => SKIN_MAP[id];

export const isSkinId = (value: unknown): value is SkinId =>
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);

/** A skin with a single mode forces it; next-themes gets it as `forcedTheme`. */
export const getForcedMode = (skin: SkinDefinition): SkinMode | undefined =>
    skin.modes.length === 1 ? skin.modes[0] : undefined;

export const getEffectiveMode = (skin: SkinDefinition, preferred: SkinMode): SkinMode =>
    skin.modes.includes(preferred) ? preferred : skin.modes[0];

/**
 * Personal choice wins over the club default. Today the club default is always PafPaf;
 * TASK-410 brings it from the Portal.
 */
export const resolveSkin = (personal: SkinId | null, clubDefault: SkinId = DEFAULT_SKIN): SkinId =>
    personal ?? clubDefault;

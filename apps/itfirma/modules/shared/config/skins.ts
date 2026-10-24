/**
 * Looks of the studio site, ported from the CRM skins (packages/ui/src/styles/skins.css) so a client
 * sees the same palettes the product offers. Tokens live in app/globals.css under `[data-skin]`.
 */

export const SKIN_IDS = ["black", "cristal", "sociopath", "coqueta"] as const;

export type SkinId = (typeof SKIN_IDS)[number];
export type SkinMode = "light" | "dark";

export interface SkinDefinition {
    id: SkinId;
    /** First mode is the skin's own; a skin with one mode forces it. */
    modes: readonly [SkinMode] | readonly [SkinMode, SkinMode];
}

const BOTH: readonly [SkinMode, SkinMode] = ["light", "dark"];
const DARK_FIRST: readonly [SkinMode, SkinMode] = ["dark", "light"];
const DARK_ONLY: readonly [SkinMode] = ["dark"];

const SKIN_MAP: Record<SkinId, SkinDefinition> = {
    black: { id: "black", modes: DARK_ONLY },
    cristal: { id: "cristal", modes: BOTH },
    sociopath: { id: "sociopath", modes: DARK_FIRST },
    coqueta: { id: "coqueta", modes: BOTH },
};

export const DEFAULT_SKIN: SkinId = "black";

export const SKINS: readonly SkinDefinition[] = SKIN_IDS.map((id) => SKIN_MAP[id]);

export const isSkinId = (value: unknown): value is SkinId =>
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);

export const getSkin = (id: SkinId): SkinDefinition => SKIN_MAP[id];

export const getEffectiveMode = (skin: SkinDefinition, preferred: SkinMode): SkinMode =>
    skin.modes.includes(preferred) ? preferred : skin.modes[0];

export const SKIN_KEY = "itfirma.skin";
export const MODE_KEY = "itfirma.mode";
export const SKIN_EVENT = "itfirma:skin";

const OWN_MODES = Object.fromEntries(SKINS.map((skin) => [skin.id, skin.modes[0]]));
const FORCED_MODES = Object.fromEntries(
    SKINS.filter((skin) => skin.modes.length === 1).map((skin) => [skin.id, skin.modes[0]])
);

/**
 * Runs before paint so a saved look never flashes the default one. Same rules as `applySkin` in
 * `modules/shared/ui/use-skin.ts`: an unknown skin falls back to the default, a skin with one mode
 * forces it, no saved mode means the skin's own.
 */
export const SKIN_SCRIPT = `(function(){try{var d=document.documentElement,O=${JSON.stringify(OWN_MODES)},F=${JSON.stringify(FORCED_MODES)},s=localStorage.getItem("${SKIN_KEY}"),m=localStorage.getItem("${MODE_KEY}");if(!O[s])s="${DEFAULT_SKIN}";if(F[s])m=F[s];else if(m!=="light"&&m!=="dark")m=O[s];d.setAttribute("data-skin",s);d.classList.toggle("dark",m==="dark")}catch(e){}})();`;

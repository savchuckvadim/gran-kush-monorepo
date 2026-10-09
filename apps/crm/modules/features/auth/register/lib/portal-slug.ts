/** Same rule as RegisterPortalDto.name on the API. */
export const PORTAL_SLUG_PATTERN = /^[a-z0-9-]+$/;
export const PORTAL_SLUG_MIN = 3;
export const PORTAL_SLUG_MAX = 40;

const CYRILLIC: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
};

/**
 * Club address from its name: "Клуб Ñandú" → "klub-nandu".
 * Cyrillic is transliterated before NFD, otherwise «й» would lose its breve and become «i».
 */
export const makePortalSlug = (value: string): string =>
    Array.from(value.toLowerCase())
        .map((char) => CYRILLIC[char] ?? char)
        .join("")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, PORTAL_SLUG_MAX)
        .replace(/-+$/g, "");

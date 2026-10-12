"use client";

import { useState } from "react";

import type { EntityFilterField } from "./types";

export const MAX_VISIBLE_FIELDS = 10;

const readKeys = (storeKey: string): string[] | null => {
    if (typeof window === "undefined") return null;
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(storeKey) ?? "null");
        return Array.isArray(parsed) && parsed.every((key) => typeof key === "string")
            ? parsed
            : null;
    } catch {
        return null;
    }
};

/**
 * The fields in the panel: the viewer's own pick (this browser only), else the defaults. A field
 * with a value is always there, so a shared link shows what it filters by.
 */
export function useVisibleFields(
    storageKey: string,
    fields: EntityFilterField[],
    activeKeys: string[]
) {
    const storeKey = `pafpaf.filter.${storageKey}.fields`;
    const [picked, setPicked] = useState<string[] | null>(() => readKeys(storeKey));

    const defaults = fields.filter((field) => field.isDefault).map((field) => field.key);
    const base = picked ?? (defaults.length > 0 ? defaults : fields.map((field) => field.key));
    const rest = fields.filter((f) => base.includes(f.key) && !activeKeys.includes(f.key));
    const room = Math.max(0, MAX_VISIBLE_FIELDS - activeKeys.length);
    const kept = new Set([...activeKeys, ...rest.slice(0, room).map((field) => field.key)]);
    const visible = fields.filter((field) => kept.has(field.key));

    const toggle = (key: string) => {
        const keys = visible.map((field) => field.key);
        const next = keys.includes(key)
            ? keys.filter((k) => k !== key)
            : [...keys, key].slice(0, MAX_VISIBLE_FIELDS);
        setPicked(next);
        try {
            window.localStorage.setItem(storeKey, JSON.stringify(next));
        } catch {
            // private mode: the pick lasts until the page is closed
        }
    };

    return { visible, toggle };
}

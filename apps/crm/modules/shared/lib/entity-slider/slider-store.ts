import { type EntityRef, isEntityKind } from "./entity-ref";

export interface SliderEntry extends EntityRef {
    /** The entity's page: shown in the address bar while the panel is open */
    href: string;
}

/** Deeper panels get too narrow to read: the fourth replaces the third. */
export const MAX_SLIDER_DEPTH = 3;

const HISTORY_KEY = "entitySlider";
const EMPTY: readonly SliderEntry[] = [];

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isEntry = (value: unknown): value is SliderEntry =>
    isObject(value) &&
    isEntityKind(value.kind) &&
    typeof value.id === "string" &&
    typeof value.href === "string";

const stackIn = (state: unknown): readonly SliderEntry[] => {
    const raw = isObject(state) ? state[HISTORY_KEY] : undefined;
    return Array.isArray(raw) ? raw.filter(isEntry) : EMPTY;
};

const sameEntity = (a: EntityRef | undefined, b: EntityRef): boolean =>
    !!a && a.kind === b.kind && a.id === b.id;

let stack: readonly SliderEntry[] = EMPTY;
/** Where the page under the panels lives, to come back to when history is not ours */
let baseHref = "";
const listeners = new Set<() => void>();

const setStack = (next: readonly SliderEntry[]) => {
    stack = next;
    listeners.forEach((listener) => listener());
};

/*
 * The address bar shows the entity, as in Bitrix24: the link can be copied, a reload opens the
 * entity as a page. Next.js keeps its router data in `history.state` and syncs its router on any
 * outside pushState — which would swap the page's URL params and reset the list under the panel.
 * Carrying Next's own entry over (`__NA` and the tree) makes it leave the page alone, and
 * back/forward restore the same page with the panels taken from our key.
 */
const writeHistory = (next: readonly SliderEntry[], href: string, mode: "push" | "replace") => {
    const current: JsonObject = isObject(window.history.state) ? window.history.state : {};
    const state = { ...current, [HISTORY_KEY]: next };
    if (mode === "push") window.history.pushState(state, "", href);
    else window.history.replaceState(state, "", href);
};

const onPopState = (event: PopStateEvent) => setStack(stackIn(event.state));

export const sliderStore = {
    subscribe(listener: () => void): () => void {
        if (listeners.size === 0) window.addEventListener("popstate", onPopState);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) window.removeEventListener("popstate", onPopState);
        };
    },

    getSnapshot: (): readonly SliderEntry[] => stack,

    getServerSnapshot: (): readonly SliderEntry[] => EMPTY,

    open(ref: EntityRef, href: string): void {
        if (sameEntity(stack[stack.length - 1], ref)) return;
        if (stack.length === 0) baseHref = window.location.href;

        const entry: SliderEntry = { ...ref, href };
        if (stack.length >= MAX_SLIDER_DEPTH) {
            const next = [...stack.slice(0, -1), entry];
            writeHistory(next, href, "replace");
            setStack(next);
            return;
        }
        const next = [...stack, entry];
        writeHistory(next, href, "push");
        setStack(next);
    },

    /** The top panel becomes another entity: the created order takes the place of its draft. */
    replaceTop(ref: EntityRef, href: string): void {
        if (stack.length === 0) return;
        const next = [...stack.slice(0, -1), { ...ref, href }];
        writeHistory(next, href, "replace");
        setStack(next);
    },

    /** Closes the top panel. Our own history entry is left with «back», like the browser button. */
    close(): void {
        if (stack.length === 0) return;
        if (stackIn(window.history.state).length === stack.length) {
            window.history.back();
            return;
        }
        const next = stack.slice(0, -1);
        writeHistory(next, next[next.length - 1]?.href ?? baseHref, "replace");
        setStack(next);
    },

    /**
     * A real navigation took the page away (a link inside a panel): the panels go, history stays.
     * Forward to a panel entry also changes the router path — to the top panel's own page.
     */
    syncWithPath(pathname: string): void {
        const top = stack[stack.length - 1];
        if (!top) return;
        if (new URL(top.href, window.location.origin).pathname === pathname) return;
        if (stackIn(window.history.state).length > 0) return;
        setStack(EMPTY);
    },
};

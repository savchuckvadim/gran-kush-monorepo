import { PROVIDER } from "./provider";
import type { LegalUi } from "./types";

/** One run of inline text (see LegalBlock), shared by the page and the downloadable files. */
export type InlinePart =
    | { kind: "text"; text: string }
    | { kind: "doc"; text: string; doc: string }
    | { kind: "link"; text: string; href: string }
    | { kind: "pending"; text: string };

const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\{(name|nif|address|email)\}/g;

export const parseInline = (text: string, ui: LegalUi): InlinePart[] => {
    const parts: InlinePart[] = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const [whole, label, href, field] = match;
        if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
        if (label && href?.startsWith("doc:")) {
            parts.push({ kind: "doc", text: label, doc: href.slice("doc:".length) });
        } else if (label && href) {
            parts.push({ kind: "link", text: label, href });
        } else if (field === "name") {
            parts.push({ kind: "text", text: PROVIDER.name });
        } else if (field === "nif" || field === "address" || field === "email") {
            const value = PROVIDER[field];
            parts.push(
                value ? { kind: "text", text: value } : { kind: "pending", text: ui.pending[field] }
            );
        }
        last = match.index + whole.length;
    }
    if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
    return parts;
};

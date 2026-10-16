export type PartnerStatus = "done" | "wip" | "plan";

/** One run of inline text of the partner brief (see PartnerBlock), shared by the page and the files. */
export type PartnerInlinePart =
    | { kind: "text"; text: string }
    | { kind: "doc"; text: string; doc: string }
    | { kind: "pill"; text: string; status: PartnerStatus };

const INLINE = /\{(done|wip|plan)(?::([^}]+))?\}|\[([^\]]+)\]\(doc:([a-z-]+)\)/g;

const isStatus = (value: string): value is PartnerStatus =>
    value === "done" || value === "wip" || value === "plan";

export const parsePartnerInline = (
    text: string,
    labels: Record<PartnerStatus, string>
): PartnerInlinePart[] => {
    const parts: PartnerInlinePart[] = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const [whole, status, pillLabel, linkLabel, doc] = match;
        if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
        if (status && isStatus(status)) {
            parts.push({ kind: "pill", text: pillLabel ?? labels[status], status });
        } else if (linkLabel && doc) {
            parts.push({ kind: "doc", text: linkLabel, doc });
        }
        last = match.index + whole.length;
    }
    if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
    return parts;
};

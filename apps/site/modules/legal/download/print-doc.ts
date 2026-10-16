import type { Locale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";
import { absoluteUrl, SITE_NAME } from "@/modules/shared/config/site";

import { formatLegalVersion, LEGAL_CONTENT } from "../content";
import { parseInline } from "../inline";
import { PARTNER_BRIEF } from "../partner-content";
import { parsePartnerInline, type PartnerStatus } from "../partner-inline";
import type { LegalDocId, LegalUi } from "../types";

/** A highlighted run: a detail still pending in the legal texts or a status pill of the partner brief. */
export type MarkTone = "pending" | PartnerStatus;

export const MARK_COLORS: Record<MarkTone, string> = {
    pending: "FFE58A",
    done: "D3F2DC",
    wip: "FFEFB3",
    plan: "E8E8ED",
};

export type PrintInline =
    | { kind: "text"; text: string }
    | { kind: "link"; text: string; href: string }
    | { kind: "mark"; text: string; tone: MarkTone };

export type PrintBlock =
    | { kind: "p"; parts: PrintInline[] }
    | { kind: "h3"; text: string }
    | { kind: "list"; items: PrintInline[][] }
    | { kind: "table"; head: string[]; rows: PrintInline[][][] }
    | { kind: "facts"; facts: { term: string; value: string }[] }
    | { kind: "timeline"; items: { time: string; parts: PrintInline[] }[] };

/** What the PDF and DOCX files are made from: a legal page or the partner brief, links made absolute. */
export interface PrintDoc {
    locale: Locale;
    url: string;
    eyebrow: string;
    title: string;
    subject: string;
    lead: PrintInline[][];
    note?: string;
    sections: { heading: string; blocks: PrintBlock[] }[];
}

const docLink = (locale: Locale, text: string, doc: string): PrintInline => ({
    kind: "link",
    text,
    href: absoluteUrl(ROUTES.legal(locale, doc)),
});

const legalInline = (text: string, locale: Locale, ui: LegalUi): PrintInline[] =>
    parseInline(text, ui).map((part) => {
        switch (part.kind) {
            case "doc":
                return docLink(locale, part.text, part.doc);
            case "pending":
                return { kind: "mark", text: part.text, tone: "pending" };
            default:
                return part;
        }
    });

export const legalPrintDoc = (doc: LegalDocId, locale: Locale): PrintDoc => {
    const { ui, docs } = LEGAL_CONTENT[locale];
    const document = docs[doc];
    const inline = (text: string) => legalInline(text, locale, ui);
    return {
        locale,
        url: absoluteUrl(ROUTES.legal(locale, doc)),
        eyebrow: `${SITE_NAME} · ${ui.eyebrow}`,
        title: document.title,
        subject: document.description,
        lead: [[{ kind: "text", text: `${ui.updated}: ${formatLegalVersion(locale)}` }]],
        note: ui.translationNote,
        sections: document.sections.map((section) => ({
            heading: section.heading,
            blocks: section.blocks.map((block): PrintBlock => {
                if (typeof block === "string") return { kind: "p", parts: inline(block) };
                if ("list" in block) return { kind: "list", items: block.list.map(inline) };
                return {
                    kind: "table",
                    head: block.table.head,
                    rows: block.table.rows.map((row) => row.map(inline)),
                };
            }),
        })),
    };
};

export const partnerPrintDoc = (locale: Locale): PrintDoc => {
    const content = PARTNER_BRIEF[locale];
    const inline = (text: string): PrintInline[] =>
        parsePartnerInline(text, content.status).map((part) => {
            switch (part.kind) {
                case "doc":
                    return docLink(locale, part.text, part.doc);
                case "pill":
                    return { kind: "mark", text: part.text, tone: part.status };
                default:
                    return part;
            }
        });
    const legend = (["done", "wip", "plan"] as const).flatMap((status, index): PrintInline[] => [
        ...(index ? [{ kind: "text" as const, text: " · " }] : []),
        { kind: "mark", text: content.status[status], tone: status },
        { kind: "text", text: ` ${content.legend[status]}` },
    ]);
    return {
        locale,
        url: absoluteUrl(ROUTES.partners(locale)),
        eyebrow: `${SITE_NAME} · ${content.eyebrow}`,
        title: content.title,
        subject: content.description,
        lead: [[{ kind: "text", text: content.description }], legend],
        sections: content.sections.map((section) => ({
            heading: section.heading,
            blocks: section.blocks.map((block): PrintBlock => {
                if ("p" in block) return { kind: "p", parts: inline(block.p) };
                if ("h3" in block) return { kind: "h3", text: block.h3 };
                if ("list" in block) return { kind: "list", items: block.list.map(inline) };
                if ("facts" in block) return { kind: "facts", facts: block.facts };
                if ("table" in block) {
                    return {
                        kind: "table",
                        head: block.table.head,
                        rows: block.table.rows.map((row) => row.map(inline)),
                    };
                }
                return {
                    kind: "timeline",
                    items: block.timeline.map((item) => ({
                        time: item.time,
                        parts: inline(item.text),
                    })),
                };
            }),
        })),
    };
};

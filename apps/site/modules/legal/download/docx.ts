import {
    Document,
    ExternalHyperlink,
    Footer,
    HeadingLevel,
    Packer,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TabStopPosition,
    TabStopType,
    TextRun,
    WidthType,
} from "docx";

import type { Locale } from "@/modules/shared/config/locales";

import { PROVIDER } from "../provider";

import { MARK_COLORS, type PrintBlock, type PrintDoc, type PrintInline } from "./print-doc";

import "server-only";

const LANGUAGE: Record<Locale, string> = { es: "es-ES", en: "en-GB", ru: "ru-RU" };

const FONT = "Arial";
const INK = "1D1D1F";
const MUTED = "6E6E73";
const HEAD_FILL = "F2F2F4";
// A4 width between the default 1-inch margins, in twentieths of a point.
const TEXT_WIDTH = TabStopPosition.MAX;

// docx sizes are half-points
const inline = (parts: PrintInline[], size?: number, color?: string) =>
    parts.map((part) => {
        switch (part.kind) {
            case "text":
                return new TextRun({ text: part.text, size, color });
            case "link":
                return new ExternalHyperlink({
                    link: part.href,
                    children: [new TextRun({ text: part.text, style: "Hyperlink", size })],
                });
            case "mark":
                return new TextRun({
                    text: part.text,
                    size,
                    color: INK,
                    shading: {
                        type: ShadingType.CLEAR,
                        fill: MARK_COLORS[part.tone],
                        color: "auto",
                    },
                });
        }
    });

const table = (columns: number, rows: (TextRun | ExternalHyperlink)[][][], header?: string[]) => {
    const width = Math.floor(TEXT_WIDTH / columns);
    const cell = (children: (TextRun | ExternalHyperlink)[], fill?: string) =>
        new TableCell({
            width: { size: width, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
            children: [new Paragraph({ spacing: { after: 0 }, children })],
        });
    return [
        new Table({
            width: { size: width * columns, type: WidthType.DXA },
            columnWidths: Array.from({ length: columns }, () => width),
            rows: [
                ...(header
                    ? [
                          new TableRow({
                              tableHeader: true,
                              cantSplit: true,
                              children: header.map((text) =>
                                  cell(
                                      [new TextRun({ text, bold: true, size: 16, color: MUTED })],
                                      HEAD_FILL
                                  )
                              ),
                          }),
                      ]
                    : []),
                ...rows.map(
                    (row) =>
                        new TableRow({
                            cantSplit: true,
                            children: row.map((children) => cell(children)),
                        })
                ),
            ],
        }),
        new Paragraph({ children: [] }),
    ];
};

const block = (item: PrintBlock): (Paragraph | Table)[] => {
    switch (item.kind) {
        case "p":
            return [new Paragraph({ children: inline(item.parts) })];
        case "h3":
            return [new Paragraph({ heading: HeadingLevel.HEADING_2, text: item.text })];
        case "list":
            return item.items.map(
                (parts) => new Paragraph({ bullet: { level: 0 }, children: inline(parts) })
            );
        case "table":
            return table(
                item.head.length,
                item.rows.map((row) => row.map((parts) => inline(parts, 18))),
                item.head
            );
        case "facts":
            return table(
                2,
                item.facts.map((fact) => [
                    [new TextRun({ text: fact.term, bold: true, size: 16, color: MUTED })],
                    [new TextRun({ text: fact.value, size: 19 })],
                ])
            );
        case "timeline":
            return table(
                2,
                item.items.map((step) => [
                    [new TextRun({ text: step.time, bold: true, size: 19 })],
                    inline(step.parts, 19),
                ])
            );
    }
};

export const renderDocx = (doc: PrintDoc): Promise<Buffer> => {
    const run = { font: FONT, color: INK, language: { value: LANGUAGE[doc.locale] } };

    const file = new Document({
        creator: PROVIDER.name,
        title: doc.title,
        description: doc.subject,
        styles: {
            default: {
                document: {
                    run: { ...run, size: 21 },
                    paragraph: { spacing: { after: 120, line: 288 } },
                },
                title: {
                    run: { ...run, size: 40, bold: true },
                    paragraph: { spacing: { after: 120 } },
                },
                heading1: {
                    run: { ...run, size: 26, bold: true },
                    paragraph: { spacing: { before: 320, after: 120 }, keepNext: true },
                },
                heading2: {
                    run: { ...run, size: 22, bold: true },
                    paragraph: { spacing: { before: 200, after: 80 }, keepNext: true },
                },
            },
        },
        sections: [
            {
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
                                children: [
                                    new ExternalHyperlink({
                                        link: doc.url,
                                        children: [
                                            new TextRun({ text: doc.url, size: 16, color: MUTED }),
                                        ],
                                    }),
                                    new TextRun({
                                        children: [
                                            "\t",
                                            PageNumber.CURRENT,
                                            " / ",
                                            PageNumber.TOTAL_PAGES,
                                        ],
                                        size: 16,
                                        color: MUTED,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: doc.eyebrow.toUpperCase(),
                                size: 16,
                                bold: true,
                                color: MUTED,
                            }),
                        ],
                    }),
                    new Paragraph({ heading: HeadingLevel.TITLE, text: doc.title }),
                    ...doc.lead.map(
                        (parts) => new Paragraph({ children: inline(parts, 18, MUTED) })
                    ),
                    ...(doc.note
                        ? [
                              new Paragraph({
                                  children: [
                                      new TextRun({
                                          text: doc.note,
                                          size: 18,
                                          italics: true,
                                          color: MUTED,
                                      }),
                                  ],
                              }),
                          ]
                        : []),
                    ...doc.sections.flatMap((section) => [
                        new Paragraph({ heading: HeadingLevel.HEADING_1, text: section.heading }),
                        ...section.blocks.flatMap(block),
                    ]),
                ],
            },
        ],
    });

    return Packer.toBuffer(file);
};

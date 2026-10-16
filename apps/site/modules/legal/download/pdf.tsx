import { Fragment } from "react";

import {
    Document,
    Font,
    Link,
    Page,
    renderToBuffer,
    StyleSheet,
    Text,
    View,
} from "@react-pdf/renderer";
import path from "path";

import { SITE_NAME } from "@/modules/shared/config/site";

import { PROVIDER } from "../provider";

import { MARK_COLORS, type PrintBlock, type PrintDoc, type PrintInline } from "./print-doc";

import "server-only";

// The standard PDF fonts have no Cyrillic. The TTFs sit in public/, which the image ships next to server.js.
const FONTS = path.join(process.cwd(), "public", "fonts");

Font.register({
    family: "Onest",
    fonts: [
        { src: path.join(FONTS, "onest-400.ttf"), fontWeight: 400 },
        { src: path.join(FONTS, "onest-600.ttf"), fontWeight: 600 },
    ],
});
// The built-in hyphenation is English-only and breaks Russian and Spanish words in odd places.
Font.registerHyphenationCallback((word) => [word]);
// With hyphenation off, the only breaks left inside a word are seams between runs: Latin "IP-" and
// Cyrillic "адрес", a link and the full stop after it. react-pdf adds a hyphen there; 10000 forbids it.
const NO_BREAK = 10000;

const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const LINE = "#d2d2d7";

const s = StyleSheet.create({
    // No lineHeight here: inherited by the fixed footer, it drops the footer from every page.
    // A unitless lineHeight multiplies the fontSize of the same style (18 when absent), so they go in pairs.
    page: {
        fontFamily: "Onest",
        fontSize: 10,
        color: INK,
        paddingTop: 48,
        paddingBottom: 64,
        paddingHorizontal: 56,
    },
    eyebrow: { fontSize: 8, fontWeight: 600, color: MUTED, letterSpacing: 1.2 },
    title: { fontSize: 22, fontWeight: 600, lineHeight: 1.15, marginTop: 6 },
    lead: { fontSize: 9, lineHeight: 1.5, color: MUTED, marginTop: 8 },
    note: {
        fontSize: 9,
        color: MUTED,
        lineHeight: 1.4,
        marginTop: 8,
        paddingLeft: 8,
        borderLeftWidth: 1.5,
        borderLeftColor: LINE,
    },
    head: { paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: LINE },
    h2: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, marginTop: 16, marginBottom: 6 },
    h3: { fontSize: 10.5, fontWeight: 600, lineHeight: 1.3, marginTop: 8, marginBottom: 4 },
    p: { fontSize: 10, lineHeight: 1.5, marginBottom: 6 },
    li: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
    bullet: { width: 12, fontSize: 10, lineHeight: 1.5 },
    liText: { flex: 1, fontSize: 10, lineHeight: 1.5 },
    link: { color: INK, textDecoration: "underline" },
    table: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginVertical: 6 },
    row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE },
    firstRow: { flexDirection: "row" },
    cell: { flex: 1, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5, lineHeight: 1.4 },
    th: { fontWeight: 600, color: MUTED, fontSize: 7.5 },
    facts: { flexDirection: "row", flexWrap: "wrap", marginVertical: 4, marginHorizontal: -3 },
    fact: {
        width: "50%",
        paddingHorizontal: 3,
        paddingBottom: 6,
    },
    factBox: { borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 6, flexGrow: 1 },
    factTerm: { fontSize: 7.5, fontWeight: 600, color: MUTED, letterSpacing: 0.5 },
    factValue: { fontSize: 9.5, lineHeight: 1.4, marginTop: 2 },
    step: {
        flexDirection: "row",
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: LINE,
    },
    stepTime: { width: 84, fontSize: 9.5, fontWeight: 600, lineHeight: 1.45 },
    stepText: { flex: 1, fontSize: 9.5, lineHeight: 1.45 },
    footer: {
        position: "absolute",
        left: 56,
        right: 56,
        bottom: 28,
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 8,
        color: MUTED,
    },
    footerLink: { color: MUTED, textDecoration: "none" },
});

const Inline = ({ parts }: { parts: PrintInline[] }) =>
    parts.map((part, index) => {
        switch (part.kind) {
            case "text":
                return part.text;
            case "link":
                return (
                    <Link key={index} src={part.href} style={s.link}>
                        {part.text}
                    </Link>
                );
            case "mark":
                return (
                    <Text key={index} style={{ backgroundColor: `#${MARK_COLORS[part.tone]}` }}>
                        {part.text}
                    </Text>
                );
        }
    });

const Block = ({ block }: { block: PrintBlock }) => {
    switch (block.kind) {
        case "p":
            return (
                <Text style={s.p} hyphenationPenalty={NO_BREAK}>
                    <Inline parts={block.parts} />
                </Text>
            );
        case "h3":
            return (
                <Text style={s.h3} minPresenceAhead={32} hyphenationPenalty={NO_BREAK}>
                    {block.text}
                </Text>
            );
        case "list":
            return (
                <View style={s.p}>
                    {block.items.map((item, index) => (
                        <View key={index} style={s.li} wrap={false}>
                            <Text style={s.bullet}>•</Text>
                            <Text style={s.liText} hyphenationPenalty={NO_BREAK}>
                                <Inline parts={item} />
                            </Text>
                        </View>
                    ))}
                </View>
            );
        case "table":
            return (
                <View style={s.table}>
                    <View style={s.firstRow} wrap={false}>
                        {block.head.map((cell) => (
                            <Text key={cell} style={[s.cell, s.th]}>
                                {cell.toUpperCase()}
                            </Text>
                        ))}
                    </View>
                    {block.rows.map((row, rowIndex) => (
                        <View key={rowIndex} style={s.row} wrap={false}>
                            {row.map((cell, index) => (
                                <Text key={index} style={s.cell} hyphenationPenalty={NO_BREAK}>
                                    <Inline parts={cell} />
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>
            );
        case "facts":
            return (
                <View style={s.facts}>
                    {block.facts.map((fact) => (
                        <View key={fact.term} style={s.fact} wrap={false}>
                            <View style={s.factBox}>
                                <Text style={s.factTerm}>{fact.term.toUpperCase()}</Text>
                                <Text style={s.factValue} hyphenationPenalty={NO_BREAK}>
                                    {fact.value}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            );
        case "timeline":
            return (
                <View style={s.p}>
                    {block.items.map((item) => (
                        <View key={item.time} style={s.step} wrap={false}>
                            <Text style={s.stepTime}>{item.time}</Text>
                            <Text style={s.stepText} hyphenationPenalty={NO_BREAK}>
                                <Inline parts={item.parts} />
                            </Text>
                        </View>
                    ))}
                </View>
            );
    }
};

export const renderPdf = (doc: PrintDoc): Promise<Buffer> =>
    renderToBuffer(
        <Document
            title={doc.title}
            subject={doc.subject}
            author={PROVIDER.name}
            creator={SITE_NAME}
            producer={SITE_NAME}
            language={doc.locale}
        >
            <Page size="A4" style={s.page}>
                <View style={s.head}>
                    <Text style={s.eyebrow}>{doc.eyebrow.toUpperCase()}</Text>
                    <Text style={s.title} hyphenationPenalty={NO_BREAK}>
                        {doc.title}
                    </Text>
                    {doc.lead.map((line, index) => (
                        <Text key={index} style={s.lead} hyphenationPenalty={NO_BREAK}>
                            <Inline parts={line} />
                        </Text>
                    ))}
                    {doc.note && <Text style={s.note}>{doc.note}</Text>}
                </View>

                {/* flat on the page: minPresenceAhead only looks at siblings */}
                {doc.sections.map((section) => (
                    <Fragment key={section.heading}>
                        <Text style={s.h2} minPresenceAhead={48} hyphenationPenalty={NO_BREAK}>
                            {section.heading}
                        </Text>
                        {section.blocks.map((block, index) => (
                            <Block key={index} block={block} />
                        ))}
                    </Fragment>
                ))}

                <View style={s.footer} fixed>
                    <Link src={doc.url} style={s.footerLink}>
                        {doc.url}
                    </Link>
                    <Text
                        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );

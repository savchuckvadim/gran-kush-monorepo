import NextLink from "next/link";

import { SiteFrame } from "@site/theme";
import type { ReactNode } from "react";

import { getSiteDoc } from "@/modules/entities/site/api";
import type { Locale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";

import { formatLegalVersion, LEGAL_CONTENT } from "./content";
import { DocTools } from "./doc-tools";
import { parseInline } from "./inline";
import { LEGAL_VERSION } from "./provider";
import { LEGAL_DOCS, type LegalBlock, type LegalContent, type LegalDocId } from "./types";

import "./legal.css";

const renderInline = (text: string, locale: Locale, content: LegalContent): ReactNode[] =>
    parseInline(text, content.ui).map((part, index) => {
        switch (part.kind) {
            case "text":
                return part.text;
            case "doc":
                return (
                    <NextLink key={index} href={ROUTES.legal(locale, part.doc)}>
                        {part.text}
                    </NextLink>
                );
            case "link":
                return (
                    <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
                        {part.text}
                    </a>
                );
            case "pending":
                return (
                    <mark key={index} className="legal__todo">
                        {part.text}
                    </mark>
                );
        }
    });

const Block = ({
    block,
    locale,
    content,
}: {
    block: LegalBlock;
    locale: Locale;
    content: LegalContent;
}) => {
    if (typeof block === "string") return <p>{renderInline(block, locale, content)}</p>;
    if ("list" in block) {
        return (
            <ul>
                {block.list.map((item) => (
                    <li key={item}>{renderInline(item, locale, content)}</li>
                ))}
            </ul>
        );
    }
    return (
        <div className="legal__table">
            <table>
                <thead>
                    <tr>
                        {block.table.head.map((cell) => (
                            <th key={cell}>{cell}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {block.table.rows.map((row) => (
                        <tr key={row.join("|")}>
                            {row.map((cell, index) => (
                                <td key={index}>{renderInline(cell, locale, content)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const LegalPage = async ({ doc, locale }: { doc: LegalDocId; locale: Locale }) => {
    const site = await getSiteDoc(locale);
    const content = LEGAL_CONTENT[locale];
    const { ui } = content;
    const document = content.docs[doc];

    return (
        <SiteFrame locale={locale} site={site} current="legal">
            <article className="legal wrap">
                <header className="legal__head">
                    <p className="eyebrow">{ui.eyebrow}</p>
                    <h1 className="legal__title">{document.title}</h1>
                    <div className="legal__bar">
                        <p className="legal__meta">
                            {ui.updated}:{" "}
                            <time dateTime={LEGAL_VERSION}>{formatLegalVersion(locale)}</time>
                        </p>
                        <DocTools
                            ui={ui}
                            href={(format) => ROUTES.legalFile(locale, doc, format)}
                        />
                    </div>
                    {ui.translationNote && <p className="legal__note">{ui.translationNote}</p>}
                </header>

                {document.sections.map((section) => (
                    <section key={section.heading} className="legal__section">
                        <h2>{section.heading}</h2>
                        {section.blocks.map((block, index) => (
                            <Block key={index} block={block} locale={locale} content={content} />
                        ))}
                    </section>
                ))}

                <nav className="legal__nav" aria-label={ui.otherDocs}>
                    <p className="legal__nav-title">{ui.otherDocs}</p>
                    <ul>
                        {LEGAL_DOCS.map((id) => (
                            <li key={id}>
                                <NextLink
                                    href={ROUTES.legal(locale, id)}
                                    aria-current={id === doc ? "page" : undefined}
                                >
                                    {content.docs[id].title}
                                </NextLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </article>
        </SiteFrame>
    );
};

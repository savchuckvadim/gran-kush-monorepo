import NextLink from "next/link";

import { SiteFrame } from "@site/theme";
import type { ReactNode } from "react";

import { getSiteDoc } from "@/modules/entities/site/api";
import type { Locale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";

import { en } from "./content/en";
import { es } from "./content/es";
import { ru } from "./content/ru";
import { LEGAL_VERSION, PROVIDER } from "./provider";
import { LEGAL_DOCS, type LegalBlock, type LegalContent, type LegalDocId } from "./types";

import "./legal.css";

export const LEGAL_CONTENT: Record<Locale, LegalContent> = { es, en, ru };

const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\{(name|nif|address|email)\}/g;

const renderInline = (text: string, locale: Locale, content: LegalContent): ReactNode[] => {
    const nodes: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const [whole, label, href, field] = match;
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const key = `${match.index}`;
        if (label && href?.startsWith("doc:")) {
            nodes.push(
                <NextLink key={key} href={ROUTES.legal(locale, href.slice("doc:".length))}>
                    {label}
                </NextLink>
            );
        } else if (label && href) {
            nodes.push(
                <a key={key} href={href} target="_blank" rel="noopener noreferrer">
                    {label}
                </a>
            );
        } else if (field === "name") {
            nodes.push(PROVIDER.name);
        } else if (field === "nif" || field === "address" || field === "email") {
            nodes.push(
                PROVIDER[field] ?? (
                    <mark key={key} className="legal__todo">
                        {content.ui.pending[field]}
                    </mark>
                )
            );
        }
        last = match.index + whole.length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
};

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
    const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${LEGAL_VERSION}T12:00:00Z`)
    );

    return (
        <SiteFrame locale={locale} site={site} current="legal">
            <article className="legal wrap">
                <header className="legal__head">
                    <p className="eyebrow">{ui.eyebrow}</p>
                    <h1 className="legal__title">{document.title}</h1>
                    <p className="legal__meta">
                        {ui.updated}: <time dateTime={LEGAL_VERSION}>{updated}</time>
                    </p>
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

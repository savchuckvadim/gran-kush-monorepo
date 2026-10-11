import NextLink from "next/link";

import { SiteFrame } from "@site/theme";
import type { ReactNode } from "react";

import { getSiteDoc } from "@/modules/entities/site/api";
import type { Locale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";

import { PARTNER_BRIEF, type PartnerBlock, type PartnerBriefContent } from "./partner-content";

import "./legal.css";

type Status = "done" | "wip" | "plan";

const INLINE = /\{(done|wip|plan)(?::([^}]+))?\}|\[([^\]]+)\]\(doc:([a-z-]+)\)/g;

const Pill = ({ status, children }: { status: Status; children: ReactNode }) => (
    <span className={`legal__pill legal__pill--${status}`}>{children}</span>
);

const renderInline = (text: string, locale: Locale, content: PartnerBriefContent): ReactNode[] => {
    const nodes: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const [whole, status, pillLabel, linkLabel, doc] = match;
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const key = `${match.index}`;
        if (status) {
            const kind = status as Status;
            nodes.push(
                <Pill key={key} status={kind}>
                    {pillLabel ?? content.status[kind]}
                </Pill>
            );
        } else if (linkLabel && doc) {
            nodes.push(
                <NextLink key={key} href={ROUTES.legal(locale, doc)}>
                    {linkLabel}
                </NextLink>
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
    block: PartnerBlock;
    locale: Locale;
    content: PartnerBriefContent;
}) => {
    const inline = (text: string) => renderInline(text, locale, content);
    if ("p" in block) return <p>{inline(block.p)}</p>;
    if ("h3" in block) return <h3>{block.h3}</h3>;
    if ("list" in block) {
        return (
            <ul>
                {block.list.map((item) => (
                    <li key={item}>{inline(item)}</li>
                ))}
            </ul>
        );
    }
    if ("facts" in block) {
        return (
            <dl className="legal__facts">
                {block.facts.map((fact) => (
                    <div key={fact.term} className="legal__fact">
                        <dt>{fact.term}</dt>
                        <dd>{fact.value}</dd>
                    </div>
                ))}
            </dl>
        );
    }
    if ("table" in block) {
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
                                    <td key={index}>{inline(cell)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    return (
        <ol className="legal__timeline">
            {block.timeline.map((item) => (
                <li key={item.time}>
                    <time dateTime={item.dateTime}>{item.time}</time>
                    <span>{inline(item.text)}</span>
                </li>
            ))}
        </ol>
    );
};

/** Unlisted brief for partners: no sector details, statuses on every commitment; es/ru/en. */
export const PartnerBrief = async ({ locale }: { locale: Locale }) => {
    const site = await getSiteDoc(locale);
    const content = PARTNER_BRIEF[locale];

    return (
        <SiteFrame locale={locale} site={site} current="partners">
            <article className="legal wrap">
                <header className="legal__head">
                    <p className="eyebrow">{content.eyebrow}</p>
                    <h1 className="legal__title">{content.title}</h1>
                    <p className="legal__meta">{content.description}</p>
                    <p className="legal__note">
                        <Pill status="done">{content.status.done}</Pill> {content.legend.done} ·{" "}
                        <Pill status="wip">{content.status.wip}</Pill> {content.legend.wip} ·{" "}
                        <Pill status="plan">{content.status.plan}</Pill> {content.legend.plan}
                    </p>
                </header>

                {content.sections.map((section) => (
                    <section key={section.heading} className="legal__section">
                        <h2>{section.heading}</h2>
                        {section.blocks.map((block, index) => (
                            <Block key={index} block={block} locale={locale} content={content} />
                        ))}
                    </section>
                ))}
            </article>
        </SiteFrame>
    );
};

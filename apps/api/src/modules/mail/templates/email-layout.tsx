import {
    Body,
    Button,
    Container,
    Font,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import React from "react";

import { MAIL_BRAND_SITE_URL, MAIL_BRAND_WORDMARK } from "../consts/mail.constants";

/**
 * Палитра сайта paf-paf.app: чёрный фон и розовый акцент из фирменного градиента.
 * Только inline-стили: Tailwind и SVG почтовые клиенты режут, поэтому логотип — словесный знак.
 */
const COLORS = {
    page: "#0b0b0f",
    card: "#ffffff",
    ink: "#111827",
    muted: "#6b7280",
    faint: "#9ca3af",
    accent: "#ff5fa2",
    accentSoft: "#fff1f7",
    accentLine: "#ffd0e4",
} as const;
const FONT = "Geist, Inter, Arial, sans-serif";

export interface EmailLayoutProps {
    preview: string;
    heading: string;
    /** Абзацы до блока с кнопкой */
    intro: string[];
    instruction?: string;
    button?: { href: string; label: string };
    /** Мелкий текст под кнопкой: «если это не вы — проигнорируйте» */
    footnote?: string;
    /** Нижняя строка: копирайт или примечание клуба */
    footer: string;
}

/** Единая рамка всех писем: шапка со знаком, заголовок, текст, кнопка, подвал. */
export function EmailLayout({
    preview,
    heading,
    intro,
    instruction,
    button,
    footnote,
    footer,
}: EmailLayoutProps) {
    const siteHost = MAIL_BRAND_SITE_URL.replace(/^https?:\/\//, "");

    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Geist"
                    fallbackFontFamily="Arial"
                    webFont={{
                        url: "https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap",
                        format: "woff2",
                    }}
                />
            </Head>
            <Body
                style={{
                    backgroundColor: COLORS.page,
                    fontFamily: FONT,
                    margin: 0,
                    padding: "32px 12px",
                }}
            >
                <Preview>{preview}</Preview>
                <Container
                    style={{
                        maxWidth: 520,
                        margin: "0 auto",
                        backgroundColor: COLORS.card,
                        borderRadius: 16,
                        overflow: "hidden",
                    }}
                >
                    <Section style={{ backgroundColor: COLORS.page, padding: "22px 32px" }}>
                        <Link
                            href={MAIL_BRAND_SITE_URL}
                            style={{
                                color: "#ffffff",
                                fontSize: 22,
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textDecoration: "none",
                            }}
                        >
                            {MAIL_BRAND_WORDMARK}
                        </Link>
                    </Section>

                    <Section style={{ padding: "32px 32px 8px" }}>
                        <Heading
                            as="h1"
                            style={{ color: COLORS.ink, fontSize: 24, margin: "0 0 16px" }}
                        >
                            {heading}
                        </Heading>
                        {intro.map((paragraph, index) => (
                            <Text
                                key={index}
                                style={{
                                    color: COLORS.muted,
                                    fontSize: 15,
                                    lineHeight: "24px",
                                    margin: "0 0 12px",
                                }}
                            >
                                {paragraph}
                            </Text>
                        ))}
                    </Section>

                    {instruction || button ? (
                        <Section
                            style={{
                                margin: "8px 32px 24px",
                                padding: 24,
                                borderRadius: 12,
                                backgroundColor: COLORS.accentSoft,
                                border: `1px solid ${COLORS.accentLine}`,
                                textAlign: "center",
                            }}
                        >
                            {instruction ? (
                                <Text
                                    style={{
                                        color: COLORS.ink,
                                        fontSize: 15,
                                        lineHeight: "24px",
                                        margin: "0 0 16px",
                                    }}
                                >
                                    {instruction}
                                </Text>
                            ) : null}
                            {button ? (
                                <Button
                                    href={button.href}
                                    style={{
                                        backgroundColor: COLORS.accent,
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: 15,
                                        padding: "12px 24px",
                                        borderRadius: 10,
                                        textDecoration: "none",
                                    }}
                                >
                                    {button.label}
                                </Button>
                            ) : null}
                        </Section>
                    ) : null}

                    <Section style={{ padding: "0 32px 28px" }}>
                        {footnote ? (
                            <Text
                                style={{
                                    color: COLORS.faint,
                                    fontSize: 13,
                                    lineHeight: "20px",
                                    margin: "0 0 16px",
                                }}
                            >
                                {footnote}
                            </Text>
                        ) : null}
                        <Text style={{ color: COLORS.faint, fontSize: 12, margin: 0 }}>
                            {footer} ·{" "}
                            <Link href={MAIL_BRAND_SITE_URL} style={{ color: COLORS.faint }}>
                                {siteHost}
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

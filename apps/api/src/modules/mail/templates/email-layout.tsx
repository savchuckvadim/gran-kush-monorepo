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
 * Светлая тема PafPaf (skin "pafpaf" из packages/ui/src/styles/skins.css):
 * светлый фон страницы, белая карточка, тёмные заголовки, розовый акцент бренда.
 * Только inline-стили и plain hex — почтовые клиенты режут <style>, SVG и CSS-переменные.
 */
const COLORS = {
    page: "#f6f6f8",
    card: "#ffffff",
    ink: "#0d0d12",
    muted: "#62626f",
    faint: "#9a9aa3",
    accent: "#ff5fa2",
    border: "#e6e6eb",
} as const;
/** Тонкая полоса сверху карточки: розовый → фиолетовый, без пёстрых стопов сайта. */
const FLOW_GRADIENT = "linear-gradient(90deg, #ff5fa2, #6c4dff)";
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

/**
 * Единая рамка всех писем: словесный знак над карточкой, белая карточка
 * с центрированным заголовком, текстом и кнопкой-пилюлей, подвал под карточкой.
 * Секции — таблицы шириной 100%, поэтому отступы только через padding:
 * горизонтальный margin выталкивал блок за пределы карточки.
 */
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
                <Container style={{ maxWidth: 560, margin: "0 auto" }}>
                    <Section style={{ padding: "4px 0 20px", textAlign: "center" }}>
                        <Link
                            href={MAIL_BRAND_SITE_URL}
                            style={{
                                color: COLORS.ink,
                                fontSize: 24,
                                fontWeight: 700,
                                letterSpacing: "-0.03em",
                                textDecoration: "none",
                            }}
                        >
                            {MAIL_BRAND_WORDMARK}
                        </Link>
                    </Section>

                    <Section
                        style={{
                            backgroundColor: COLORS.card,
                            borderRadius: 18,
                            border: `1px solid ${COLORS.border}`,
                            overflow: "hidden",
                        }}
                    >
                        <Section
                            style={{
                                height: 4,
                                backgroundColor: COLORS.accent,
                                backgroundImage: FLOW_GRADIENT,
                                fontSize: 1,
                                lineHeight: "4px",
                            }}
                        >
                            &nbsp;
                        </Section>

                        <Section style={{ padding: "36px 32px 8px", textAlign: "center" }}>
                            <Heading
                                as="h1"
                                style={{
                                    color: COLORS.ink,
                                    fontSize: 24,
                                    lineHeight: "32px",
                                    margin: "0 0 16px",
                                }}
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
                            <Section style={{ padding: "8px 32px 4px", textAlign: "center" }}>
                                {instruction ? (
                                    <Text
                                        style={{
                                            color: COLORS.muted,
                                            fontSize: 15,
                                            lineHeight: "24px",
                                            margin: "0 0 20px",
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
                                            lineHeight: "20px",
                                            padding: "14px 36px",
                                            borderRadius: 999,
                                            textDecoration: "none",
                                        }}
                                    >
                                        {button.label}
                                    </Button>
                                ) : null}
                            </Section>
                        ) : null}

                        <Section style={{ padding: "20px 32px 32px", textAlign: "center" }}>
                            {footnote ? (
                                <Text
                                    style={{
                                        color: COLORS.faint,
                                        fontSize: 13,
                                        lineHeight: "20px",
                                        margin: 0,
                                    }}
                                >
                                    {footnote}
                                </Text>
                            ) : null}
                        </Section>
                    </Section>

                    <Section style={{ padding: "20px 0 0", textAlign: "center" }}>
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

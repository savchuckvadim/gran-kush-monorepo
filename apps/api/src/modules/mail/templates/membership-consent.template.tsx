import {
    Body,
    Button,
    Container,
    Font,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import React from "react";

import { MAIL_BRAND_NAME } from "../consts/mail.constants";
import { Language } from "../consts/verifiaction-email";
import { getMembershipConsentEmailTexts } from "../lib/utils/template.util";

interface MembershipConsentTemplateProps {
    portalName: string;
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Клуб добавил существующий аккаунт по email: владелец подтверждает членство на странице CRM. */
export function MembershipConsentTemplate({
    portalName,
    token,
    language = "en",
    baseUrl,
}: MembershipConsentTemplateProps) {
    const consentLink = `${baseUrl}/${language}/consent/${token}`;
    const texts = getMembershipConsentEmailTexts(language);
    const currentYear = new Date().getFullYear();

    return (
        <Tailwind>
            <Html>
                <Head>
                    <Font
                        fontFamily="Geist"
                        fallbackFontFamily="Arial"
                        webFont={{
                            url: "https://fonts.googleapis.com/css2?family=Geist:wght@300;500;700&display=swap",
                            format: "woff2",
                        }}
                    />
                </Head>

                <Body
                    style={{ backgroundColor: "#f8f9fa", fontFamily: "Inter, Arial, sans-serif" }}
                >
                    <Preview>{texts.preview(portalName)}</Preview>
                    <Container className="mx-auto my-10 max-w-[500px] rounded-lg bg-white p-8 shadow-lg">
                        <Section className="text-center">
                            <Text
                                className="mb-4 text-xl font-bold text-gray-900"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {MAIL_BRAND_NAME}
                            </Text>
                            <Heading
                                className="text-2xl font-bold text-blue-600"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.heading}
                            </Heading>
                            <Text
                                className="mb-6 text-gray-500"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.intro(portalName)}
                            </Text>
                            <Section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-6">
                                <Text
                                    className="mb-4 text-gray-800"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.instruction}
                                </Text>
                                <Button
                                    href={consentLink}
                                    className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.buttonText}
                                </Button>
                            </Section>
                            <Text
                                className="text-sm text-gray-400"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.ignoreText}
                            </Text>
                            <Text
                                className="mt-6 text-xs text-gray-300"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.copyright(currentYear)}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
}

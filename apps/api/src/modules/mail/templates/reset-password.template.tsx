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
import { getResetPasswordEmailTexts } from "../lib/utils/template.util";

interface ResetPasswordTemplateProps {
    name: string;
    token: string;
    language?: Language;
    baseUrl: string;
}

export function ResetPasswordTemplate({
    name,
    token,
    language = "en",
    baseUrl,
}: ResetPasswordTemplateProps) {
    // Both the CRM and the member portal serve this page at /{locale}/auth/reset-password
    const resetLink = `${baseUrl}/${language}/auth/reset-password?token=${token}`;
    const currentYear = new Date().getFullYear();
    const texts = getResetPasswordEmailTexts(language);
    return (
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
            <Tailwind>
                <Body>
                    <Preview>{texts.preview}</Preview>
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
                                {texts.greeting(name)}
                            </Text>
                            <Section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-6">
                                <Text
                                    className="mb-4 text-gray-800"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.instruction}
                                </Text>
                                <Button
                                    href={resetLink}
                                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-600/90 leading-none"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.buttonText}
                                </Button>
                            </Section>
                            <Text
                                className="text-sm text-gray-500"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.ignoreText}
                            </Text>
                            <Text
                                className="mt-6 text-sm text-gray-400"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.copyright(currentYear)}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}

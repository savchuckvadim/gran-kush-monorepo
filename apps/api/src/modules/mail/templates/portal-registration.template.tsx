import React from "react";
import {
    Body,
    Button,
    Container,
    Font,
    Head,
    Heading,
    Html,
    Img,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";

import { getPortalRegistrationEmailTexts } from "../lib/utils/template.util";
import { Language } from "../consts/verifiaction-email";

interface PortalRegistrationTemplateProps {
    ownerName: string;
    portalDisplayName: string;
    loginLink: string;
    language?: Language;
    baseUrl: string;
}

export function PortalRegistrationTemplate({
    ownerName,
    portalDisplayName,
    loginLink,
    language = "en",
    baseUrl,
}: PortalRegistrationTemplateProps) {
    const logo = `${baseUrl}/touch-icons/512x512.png`;
    const currentYear = new Date().getFullYear();
    const texts = getPortalRegistrationEmailTexts(language);

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

                <Body style={{ backgroundColor: "#f8f9fa", fontFamily: "Inter, Arial, sans-serif" }}>
                    <Preview>{texts.preview}</Preview>

                    <Container className="mx-auto my-10 max-w-[500px] rounded-lg bg-white p-8 shadow-lg">
                        <Section className="text-center">
                            <Img
                                src={logo}
                                width="100"
                                height="100"
                                alt="April"
                                className="mx-auto mb-4"
                            />

                            <Heading
                                className="text-2xl font-bold text-blue-600"
                                style={{ fontFamily: "Geist, Arial" }}
                            >
                                {texts.heading}
                            </Heading>

                            <Text className="mb-6 text-gray-500" style={{ fontFamily: "Geist, Arial" }}>
                                {texts.greeting(ownerName)}
                            </Text>

                            <Section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-6">
                                <Text
                                    className="mb-4 text-gray-800"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.instruction}
                                </Text>

                                <Button
                                    href={loginLink}
                                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-600/90 leading-none"
                                    style={{ fontFamily: "Geist, Arial" }}
                                >
                                    {texts.buttonText}
                                </Button>
                            </Section>

                            <Text className="text-sm text-gray-500" style={{ fontFamily: "Geist, Arial" }}>
                                {texts.ignoreText}
                            </Text>

                            <Text className="mt-6 text-sm text-gray-400" style={{ fontFamily: "Geist, Arial" }}>
                                {texts.footerNote(currentYear, portalDisplayName)}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
}


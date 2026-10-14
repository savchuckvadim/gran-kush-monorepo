import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getVerificationEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface EmailVerificationTemplateProps {
    name: string;
    surname?: string | null;
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Подтверждение почты: ссылка на `/auth/confirm/{token}` кабинета или CRM. */
export function EmailVerificationTemplate({
    name,
    surname,
    token,
    language = "en",
    baseUrl,
}: EmailVerificationTemplateProps) {
    const texts = getVerificationEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview}
            heading={texts.heading}
            intro={[texts.greeting(name, surname)]}
            instruction={texts.instruction}
            button={{
                href: `${baseUrl}/${language}/auth/confirm/${token}`,
                label: texts.buttonText,
            }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

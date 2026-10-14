import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getResetPasswordEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface ResetPasswordTemplateProps {
    name: string;
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Сброс пароля: ссылка на `/auth/reset-password?token=` кабинета или CRM, живёт 1 час. */
export function ResetPasswordTemplate({
    name,
    token,
    language = "en",
    baseUrl,
}: ResetPasswordTemplateProps) {
    const texts = getResetPasswordEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview}
            heading={texts.heading}
            intro={[texts.greeting(name)]}
            instruction={texts.instruction}
            button={{
                href: `${baseUrl}/${language}/auth/reset-password?token=${token}`,
                label: texts.buttonText,
            }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

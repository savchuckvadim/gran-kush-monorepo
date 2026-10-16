import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getTelegramEmailTexts } from "../lib/utils/template.util";

import { EmailLayout } from "./email-layout";

interface TelegramEmailTemplateProps {
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Первый вход через Telegram: ссылка на `/auth/telegram/confirm` кабинета. */
export function TelegramEmailTemplate({
    token,
    language = "en",
    baseUrl,
}: TelegramEmailTemplateProps) {
    const texts = getTelegramEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview}
            heading={texts.heading}
            intro={[texts.intro]}
            instruction={texts.instruction}
            button={{
                href: `${baseUrl}/${language}/auth/telegram/confirm?token=${encodeURIComponent(token)}`,
                label: texts.buttonText,
            }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getAccountExistsEmailTexts } from "../lib/utils/template.util";

import { EmailLayout } from "./email-layout";

interface AccountExistsTemplateProps {
    language?: Language;
    baseUrl: string;
}

/** Регистрация на занятый адрес: владельцу — кнопка на вход кабинета. */
export function AccountExistsTemplate({ language = "en", baseUrl }: AccountExistsTemplateProps) {
    const texts = getAccountExistsEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview}
            heading={texts.heading}
            intro={[texts.intro]}
            instruction={texts.instruction}
            button={{ href: `${baseUrl}/${language}/auth/login`, label: texts.buttonText }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

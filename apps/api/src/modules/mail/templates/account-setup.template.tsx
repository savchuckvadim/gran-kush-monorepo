import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getAccountSetupEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface AccountSetupTemplateProps {
    token: string;
    portalName?: string;
    language?: Language;
    baseUrl: string;
}

/** Аккаунт без пароля: ссылка на страницу «новый пароль» в режиме первой настройки (TASK-664). */
export function AccountSetupTemplate({
    token,
    portalName,
    language = "en",
    baseUrl,
}: AccountSetupTemplateProps) {
    const texts = getAccountSetupEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview(portalName)}
            heading={texts.heading}
            intro={[texts.intro(portalName)]}
            instruction={texts.instruction}
            button={{
                href: `${baseUrl}/${language}/auth/reset-password?token=${token}&setup=1`,
                label: texts.buttonText,
            }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

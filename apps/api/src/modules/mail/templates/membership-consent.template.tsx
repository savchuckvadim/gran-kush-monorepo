import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getMembershipConsentEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface MembershipConsentTemplateProps {
    portalName: string;
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Клуб добавил существующий аккаунт по email: владелец подтверждает членство на странице CRM (TASK-663). */
export function MembershipConsentTemplate({
    portalName,
    token,
    language = "en",
    baseUrl,
}: MembershipConsentTemplateProps) {
    const texts = getMembershipConsentEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview(portalName)}
            heading={texts.heading}
            intro={[texts.intro(portalName)]}
            instruction={texts.instruction}
            button={{ href: `${baseUrl}/${language}/consent/${token}`, label: texts.buttonText }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

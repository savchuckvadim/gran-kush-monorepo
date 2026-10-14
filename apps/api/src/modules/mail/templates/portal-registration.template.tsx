import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getPortalRegistrationEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface PortalRegistrationTemplateProps {
    ownerName: string;
    portalDisplayName: string;
    loginLink: string;
    language?: Language;
}

/** Приветствие владельцу нового клуба со ссылкой на вход в CRM. */
export function PortalRegistrationTemplate({
    ownerName,
    portalDisplayName,
    loginLink,
    language = "en",
}: PortalRegistrationTemplateProps) {
    const texts = getPortalRegistrationEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview}
            heading={texts.heading}
            intro={[texts.greeting(ownerName)]}
            instruction={texts.instruction}
            button={{ href: loginLink, label: texts.buttonText }}
            footnote={texts.ignoreText}
            footer={texts.footerNote(new Date().getFullYear(), portalDisplayName)}
        />
    );
}

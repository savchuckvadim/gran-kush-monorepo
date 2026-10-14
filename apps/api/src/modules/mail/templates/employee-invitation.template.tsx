import React from "react";

import { Language } from "../consts/verifiaction-email";
import { getEmployeeInvitationEmailTexts } from "../lib/utils/template.util";
import { EmailLayout } from "./email-layout";

interface EmployeeInvitationTemplateProps {
    portalName: string;
    token: string;
    language?: Language;
    baseUrl: string;
}

/** Приглашение сотрудника: ссылка на страницу принятия в CRM (TASK-662). */
export function EmployeeInvitationTemplate({
    portalName,
    token,
    language = "en",
    baseUrl,
}: EmployeeInvitationTemplateProps) {
    const texts = getEmployeeInvitationEmailTexts(language);

    return (
        <EmailLayout
            preview={texts.preview(portalName)}
            heading={texts.heading}
            intro={[texts.intro(portalName)]}
            instruction={texts.instruction}
            button={{
                href: `${baseUrl}/${language}/auth/invite/${token}`,
                label: texts.buttonText,
            }}
            footnote={texts.ignoreText}
            footer={texts.copyright(new Date().getFullYear())}
        />
    );
}

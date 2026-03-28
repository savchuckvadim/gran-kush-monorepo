import { DEFAULT_LANGUAGE } from "../../consts/mail.constants";
import {
    PORTAL_REGISTRATION_EMAIL_TEXTS,
    type PortalRegistrationEmailTexts,
} from "../../consts/portal-registration-email";
import {
    Language,
    VERIFICATION_EMAIL_TEXTS,
    VerificationEmailTexts,
} from "../../consts/verifiaction-email";

export const getVerificationEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): VerificationEmailTexts => {
    return VERIFICATION_EMAIL_TEXTS[language] || VERIFICATION_EMAIL_TEXTS[DEFAULT_LANGUAGE];
};

export const getPortalRegistrationEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): PortalRegistrationEmailTexts => {
    return (
        PORTAL_REGISTRATION_EMAIL_TEXTS[language] ||
        PORTAL_REGISTRATION_EMAIL_TEXTS[DEFAULT_LANGUAGE]
    );
};

import { DEFAULT_LANGUAGE } from "../../consts/mail.constants";
import {
    MEMBERSHIP_CONSENT_EMAIL_TEXTS,
    type MembershipConsentEmailTexts,
} from "../../consts/membership-consent-email";
import {
    PORTAL_REGISTRATION_EMAIL_TEXTS,
    type PortalRegistrationEmailTexts,
} from "../../consts/portal-registration-email";
import {
    RESET_PASSWORD_EMAIL_TEXTS,
    type ResetPasswordEmailTexts,
} from "../../consts/reset-password-email";
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

export const getMembershipConsentEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): MembershipConsentEmailTexts => {
    return (
        MEMBERSHIP_CONSENT_EMAIL_TEXTS[language] || MEMBERSHIP_CONSENT_EMAIL_TEXTS[DEFAULT_LANGUAGE]
    );
};

export const getResetPasswordEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): ResetPasswordEmailTexts => {
    return RESET_PASSWORD_EMAIL_TEXTS[language] || RESET_PASSWORD_EMAIL_TEXTS[DEFAULT_LANGUAGE];
};

import {
    ACCOUNT_EXISTS_EMAIL_TEXTS,
    type AccountExistsEmailTexts,
} from "../../consts/account-exists-email";
import {
    ACCOUNT_SETUP_EMAIL_TEXTS,
    type AccountSetupEmailTexts,
} from "../../consts/account-setup-email";
import {
    EMPLOYEE_INVITATION_EMAIL_TEXTS,
    type EmployeeInvitationEmailTexts,
} from "../../consts/employee-invitation-email";
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
import { TELEGRAM_EMAIL_TEXTS, type TelegramEmailTexts } from "../../consts/telegram-email";
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

export const getAccountSetupEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): AccountSetupEmailTexts => {
    return ACCOUNT_SETUP_EMAIL_TEXTS[language] || ACCOUNT_SETUP_EMAIL_TEXTS[DEFAULT_LANGUAGE];
};

export const getEmployeeInvitationEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): EmployeeInvitationEmailTexts => {
    return (
        EMPLOYEE_INVITATION_EMAIL_TEXTS[language] ||
        EMPLOYEE_INVITATION_EMAIL_TEXTS[DEFAULT_LANGUAGE]
    );
};

export const getResetPasswordEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): ResetPasswordEmailTexts => {
    return RESET_PASSWORD_EMAIL_TEXTS[language] || RESET_PASSWORD_EMAIL_TEXTS[DEFAULT_LANGUAGE];
};

export const getAccountExistsEmailTexts = (
    language: Language = DEFAULT_LANGUAGE
): AccountExistsEmailTexts =>
    ACCOUNT_EXISTS_EMAIL_TEXTS[language] || ACCOUNT_EXISTS_EMAIL_TEXTS[DEFAULT_LANGUAGE];

export const getTelegramEmailTexts = (language: Language = DEFAULT_LANGUAGE): TelegramEmailTexts =>
    TELEGRAM_EMAIL_TEXTS[language] || TELEGRAM_EMAIL_TEXTS[DEFAULT_LANGUAGE];

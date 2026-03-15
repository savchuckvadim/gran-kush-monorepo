import { DEFAULT_LANGUAGE } from "../../consts/mail.constants";
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

import { MAIL_BRAND_NAME } from "./mail.constants";
import type { Language } from "./verifiaction-email";

export interface MembershipConsentEmailTexts {
    preview: (portalName: string) => string;
    heading: string;
    intro: (portalName: string) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

export const MEMBERSHIP_CONSENT_EMAIL_TEXTS: Record<Language, MembershipConsentEmailTexts> = {
    ru: {
        preview: (portalName) => `${portalName} добавил вас в участники`,
        heading: "Подтвердите вступление в клуб",
        intro: (portalName) =>
            `Клуб «${portalName}» добавил ваш адрес в список участников. Клуб увидит ваши документы только после вашего подтверждения — и только те, которые вы выберете.`,
        instruction:
            "Нажмите на кнопку, введите пароль от аккаунта и выберите, что показать клубу. Ссылка действует 14 дней.",
        buttonText: "Подтвердить или отказаться",
        ignoreText:
            "Если вы не знаете этот клуб, просто проигнорируйте письмо — без подтверждения членство не действует.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: (portalName) => `${portalName} te ha añadido como socio`,
        heading: "Confirma tu ingreso en el club",
        intro: (portalName) =>
            `El club «${portalName}» ha añadido tu dirección a su lista de socios. El club verá tus documentos solo cuando lo confirmes, y solo los que tú elijas.`,
        instruction:
            "Pulsa el botón, introduce la contraseña de tu cuenta y elige qué mostrar al club. El enlace es válido durante 14 días.",
        buttonText: "Confirmar o rechazar",
        ignoreText:
            "Si no conoces este club, ignora este mensaje: sin tu confirmación la membresía no tiene efecto.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: (portalName) => `${portalName} added you as a member`,
        heading: "Confirm joining the club",
        intro: (portalName) =>
            `The club “${portalName}” added your address to its member list. The club sees your documents only after you confirm, and only the ones you choose.`,
        instruction:
            "Press the button, enter your account password and choose what to show the club. The link is valid for 14 days.",
        buttonText: "Confirm or decline",
        ignoreText:
            "If you do not know this club, just ignore this email — without your confirmation the membership has no effect.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

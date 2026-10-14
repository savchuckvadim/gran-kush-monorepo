import { MAIL_BRAND_NAME } from "./mail.constants";
import type { Language } from "./verifiaction-email";

export interface EmployeeInvitationEmailTexts {
    preview: (portalName: string) => string;
    heading: string;
    intro: (portalName: string) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

export const EMPLOYEE_INVITATION_EMAIL_TEXTS: Record<Language, EmployeeInvitationEmailTexts> = {
    ru: {
        preview: (portalName) => `${portalName} приглашает вас в команду`,
        heading: "Приглашение в команду клуба",
        intro: (portalName) =>
            `Клуб «${portalName}» приглашает вас работать в ${MAIL_BRAND_NAME} — CRM клуба.`,
        instruction:
            "Нажмите на кнопку, чтобы принять приглашение. Если у вас уже есть аккаунт, понадобится его пароль. Ссылка действует 7 дней.",
        buttonText: "Принять приглашение",
        ignoreText: "Если вы не ждали приглашения, просто проигнорируйте письмо.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: (portalName) => `${portalName} te invita a su equipo`,
        heading: "Invitación al equipo del club",
        intro: (portalName) =>
            `El club «${portalName}» te invita a trabajar en ${MAIL_BRAND_NAME}, el CRM del club.`,
        instruction:
            "Pulsa el botón para aceptar la invitación. Si ya tienes una cuenta, necesitarás su contraseña. El enlace es válido durante 7 días.",
        buttonText: "Aceptar la invitación",
        ignoreText: "Si no esperabas esta invitación, ignora este mensaje.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: (portalName) => `${portalName} invites you to the team`,
        heading: "Invitation to the club team",
        intro: (portalName) =>
            `The club “${portalName}” invites you to work in ${MAIL_BRAND_NAME}, the club's CRM.`,
        instruction:
            "Press the button to accept the invitation. If you already have an account, you will need its password. The link is valid for 7 days.",
        buttonText: "Accept the invitation",
        ignoreText: "If you were not expecting this invitation, just ignore this email.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

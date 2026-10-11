import { MAIL_BRAND_NAME } from "./mail.constants";
import { Language } from "./verifiaction-email";

export interface PortalRegistrationEmailTexts {
    preview: string;
    heading: string;
    greeting: (ownerName: string) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    footerNote: (year: number, portalDisplayName: string) => string;
}

export const PORTAL_REGISTRATION_EMAIL_TEXTS: Record<Language, PortalRegistrationEmailTexts> = {
    ru: {
        preview: `Добро пожаловать в ${MAIL_BRAND_NAME}`,
        heading: `Добро пожаловать в ${MAIL_BRAND_NAME}`,
        greeting: (ownerName) => `Привет, ${ownerName}!`,
        instruction:
            "Ваш клуб успешно зарегистрирован. Нажмите кнопку ниже, чтобы войти в CRM и начать настройку.",
        buttonText: "Открыть CRM",
        ignoreText: "Если вы не создавали портал, просто проигнорируйте это письмо.",
        footerNote: (year, portalDisplayName) =>
            `© ${year} ${MAIL_BRAND_NAME} • Портал: ${portalDisplayName}`,
    },
    es: {
        preview: `Bienvenido a ${MAIL_BRAND_NAME}`,
        heading: `Bienvenido a ${MAIL_BRAND_NAME}`,
        greeting: (ownerName) => `Hola, ${ownerName}!`,
        instruction:
            "Tu club se registró correctamente. Haz clic en el botón de abajo para entrar a la CRM y comenzar la configuración.",
        buttonText: "Abrir CRM",
        ignoreText: "Si no creaste el portal, simplemente ignora este correo electrónico.",
        footerNote: (year, portalDisplayName) =>
            `© ${year} ${MAIL_BRAND_NAME} • Portal: ${portalDisplayName}`,
    },
    en: {
        preview: `Welcome to ${MAIL_BRAND_NAME}`,
        heading: `Welcome to ${MAIL_BRAND_NAME}`,
        greeting: (ownerName) => `Hi, ${ownerName}!`,
        instruction:
            "Your club has been registered successfully. Click the button below to sign in to the CRM and start configuring.",
        buttonText: "Open CRM",
        ignoreText: "If you didn't create this portal, please ignore this email.",
        footerNote: (year, portalDisplayName) =>
            `© ${year} ${MAIL_BRAND_NAME} • Portal: ${portalDisplayName}`,
    },
};

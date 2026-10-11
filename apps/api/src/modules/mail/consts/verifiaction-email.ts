import { MAIL_BRAND_NAME } from "./mail.constants";

export type Language = "ru" | "es" | "en";

export interface VerificationEmailTexts {
    preview: string;
    heading: string;
    greeting: (name: string, surname?: string | null) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

const fullName = (name: string, surname?: string | null) =>
    [name, surname].filter(Boolean).join(" ");

export const VERIFICATION_EMAIL_TEXTS: Record<Language, VerificationEmailTexts> = {
    ru: {
        preview: `Подтверждение почты в ${MAIL_BRAND_NAME}`,
        heading: "Подтвердите почту",
        greeting: (name, surname) =>
            `Привет, ${fullName(name, surname)}! Осталось подтвердить, что это ваш адрес.`,
        instruction:
            "Нажмите на кнопку ниже, чтобы подтвердить адрес электронной почты. Ссылка действительна 24 часа.",
        buttonText: "Подтвердить почту",
        ignoreText: "Если вы не регистрировались, просто проигнорируйте это письмо.",
        copyright: (year: number) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: `Confirma tu correo en ${MAIL_BRAND_NAME}`,
        heading: "Confirma tu correo",
        greeting: (name, surname) =>
            `¡Hola, ${fullName(name, surname)}! Solo falta confirmar que esta dirección es tuya.`,
        instruction:
            "Haz clic en el botón de abajo para confirmar tu dirección de correo electrónico. El enlace es válido durante 24 horas.",
        buttonText: "Confirmar correo",
        ignoreText: "Si no te has registrado, simplemente ignora este mensaje.",
        copyright: (year: number) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: `Confirm your email on ${MAIL_BRAND_NAME}`,
        heading: "Confirm your email",
        greeting: (name, surname) =>
            `Hello, ${fullName(name, surname)}! One last step: confirm that this address is yours.`,
        instruction:
            "Click the button below to confirm your email address. The link is valid for 24 hours.",
        buttonText: "Confirm email",
        ignoreText: "If you did not sign up, please ignore this message.",
        copyright: (year: number) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

import { MAIL_BRAND_NAME } from "./mail.constants";
import { Language } from "./verifiaction-email";

export interface ResetPasswordEmailTexts {
    preview: string;
    heading: string;
    greeting: (name: string) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

export const RESET_PASSWORD_EMAIL_TEXTS: Record<Language, ResetPasswordEmailTexts> = {
    ru: {
        preview: `Сброс пароля в ${MAIL_BRAND_NAME}`,
        heading: "Сброс пароля",
        greeting: (name) =>
            `Привет, ${name}! Мы получили запрос на сброс пароля для вашего аккаунта.`,
        instruction:
            "Нажмите на кнопку ниже, чтобы задать новый пароль. Ссылка действительна 1 час. После сброса все остальные сеансы будут завершены.",
        buttonText: "Задать новый пароль",
        ignoreText: "Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: `Restablecer contraseña en ${MAIL_BRAND_NAME}`,
        heading: "Restablecer contraseña",
        greeting: (name) =>
            `¡Hola, ${name}! Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.`,
        instruction:
            "Haz clic en el botón de abajo para crear una contraseña nueva. El enlace es válido durante 1 hora. Al cambiarla se cerrarán todas las demás sesiones.",
        buttonText: "Crear contraseña nueva",
        ignoreText: "Si no solicitaste el cambio de contraseña, simplemente ignora este mensaje.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: `Password reset on ${MAIL_BRAND_NAME}`,
        heading: "Password reset",
        greeting: (name) => `Hello, ${name}! We received a request to reset your account password.`,
        instruction:
            "Click the button below to set a new password. The link is valid for 1 hour. All other sessions will be signed out after the reset.",
        buttonText: "Set a new password",
        ignoreText: "If you did not request a password reset, please ignore this message.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

import { MAIL_BRAND_NAME } from "./mail.constants";
import type { Language } from "./verifiaction-email";

export interface TelegramEmailTexts {
    preview: string;
    heading: string;
    intro: string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

/**
 * Первый вход через Telegram: ссылка подтверждает почту. По ней заводится аккаунт или Telegram
 * привязывается к уже существующему аккаунту с этим адресом.
 */
export const TELEGRAM_EMAIL_TEXTS: Record<Language, TelegramEmailTexts> = {
    ru: {
        preview: `Подтвердите почту для входа в ${MAIL_BRAND_NAME} через Telegram`,
        heading: "Подтвердите почту",
        intro: `Вы входите в кабинет ${MAIL_BRAND_NAME} через Telegram. Подтвердите, что это ваша почта: на неё клубы пришлют подтверждения и новости.`,
        instruction: "Нажмите на кнопку. Ссылка действует 24 часа.",
        buttonText: "Подтвердить и войти",
        ignoreText:
            "Если вы не входили через Telegram, просто проигнорируйте письмо — без ссылки ничего не произойдёт.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: `Confirma tu correo para entrar en ${MAIL_BRAND_NAME} con Telegram`,
        heading: "Confirma tu correo",
        intro: `Estás entrando en tu área de ${MAIL_BRAND_NAME} con Telegram. Confirma que este correo es tuyo: a él te escribirán los clubes.`,
        instruction: "Pulsa el botón. El enlace es válido durante 24 horas.",
        buttonText: "Confirmar y entrar",
        ignoreText:
            "Si no has entrado con Telegram, ignora este mensaje: sin el enlace no pasa nada.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: `Confirm your email to sign in to ${MAIL_BRAND_NAME} with Telegram`,
        heading: "Confirm your email",
        intro: `You are signing in to your ${MAIL_BRAND_NAME} account with Telegram. Confirm that this email is yours: clubs will write to it.`,
        instruction: "Press the button. The link is valid for 24 hours.",
        buttonText: "Confirm and sign in",
        ignoreText:
            "If you did not sign in with Telegram, ignore this message: nothing happens without the link.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

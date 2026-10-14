import { MAIL_BRAND_NAME } from "./mail.constants";
import type { Language } from "./verifiaction-email";

export interface AccountSetupEmailTexts {
    preview: (portalName?: string) => string;
    heading: string;
    intro: (portalName?: string) => string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

/**
 * Аккаунт без пароля (его завёл клуб): письмо со ссылкой задать пароль. Уходит при создании
 * участника из CRM и когда кто-то пробует зарегистрироваться или принять приглашение с этим адресом.
 */
export const ACCOUNT_SETUP_EMAIL_TEXTS: Record<Language, AccountSetupEmailTexts> = {
    ru: {
        preview: (portalName) =>
            portalName
                ? `${portalName} создал вам аккаунт в ${MAIL_BRAND_NAME}`
                : `Ваш аккаунт в ${MAIL_BRAND_NAME}`,
        heading: "Задайте пароль для входа",
        intro: (portalName) =>
            portalName
                ? `Клуб «${portalName}» завёл для вас аккаунт участника в ${MAIL_BRAND_NAME}. Чтобы войти в кабинет, задайте пароль.`
                : `Для этого адреса в ${MAIL_BRAND_NAME} уже есть аккаунт без пароля. Чтобы войти, задайте пароль.`,
        instruction: "Нажмите на кнопку и придумайте пароль. Ссылка действует 7 дней.",
        buttonText: "Задать пароль",
        ignoreText:
            "Если вы не ждали этого письма, просто проигнорируйте его — без пароля аккаунт не работает.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: (portalName) =>
            portalName
                ? `${portalName} te ha creado una cuenta en ${MAIL_BRAND_NAME}`
                : `Tu cuenta en ${MAIL_BRAND_NAME}`,
        heading: "Crea una contraseña para entrar",
        intro: (portalName) =>
            portalName
                ? `El club «${portalName}» te ha creado una cuenta de socio en ${MAIL_BRAND_NAME}. Para entrar en tu área, crea una contraseña.`
                : `Esta dirección ya tiene una cuenta en ${MAIL_BRAND_NAME} sin contraseña. Para entrar, créala.`,
        instruction: "Pulsa el botón y elige una contraseña. El enlace es válido durante 7 días.",
        buttonText: "Crear contraseña",
        ignoreText: "Si no esperabas este mensaje, ignóralo: sin contraseña la cuenta no funciona.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: (portalName) =>
            portalName
                ? `${portalName} created an account for you on ${MAIL_BRAND_NAME}`
                : `Your ${MAIL_BRAND_NAME} account`,
        heading: "Set a password to sign in",
        intro: (portalName) =>
            portalName
                ? `The club “${portalName}” created a member account for you on ${MAIL_BRAND_NAME}. Set a password to open your account.`
                : `This address already has a ${MAIL_BRAND_NAME} account without a password. Set one to sign in.`,
        instruction: "Press the button and choose a password. The link is valid for 7 days.",
        buttonText: "Set a password",
        ignoreText:
            "If you were not expecting this email, just ignore it — without a password the account does not work.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

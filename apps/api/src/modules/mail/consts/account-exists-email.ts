import { MAIL_BRAND_NAME } from "./mail.constants";
import type { Language } from "./verifiaction-email";

export interface AccountExistsEmailTexts {
    preview: string;
    heading: string;
    intro: string;
    instruction: string;
    buttonText: string;
    ignoreText: string;
    copyright: (year: number) => string;
}

/**
 * Регистрация на адрес, у которого уже есть аккаунт (TASK-665). Ответ API одинаковый для любого
 * адреса, поэтому сообщить «такой аккаунт уже есть» можно только владельцу — письмом.
 */
export const ACCOUNT_EXISTS_EMAIL_TEXTS: Record<Language, AccountExistsEmailTexts> = {
    ru: {
        preview: `У вас уже есть аккаунт ${MAIL_BRAND_NAME}`,
        heading: "Аккаунт уже есть",
        intro: `Кто-то — возможно, вы — пытался зарегистрироваться в ${MAIL_BRAND_NAME} с этой почтой. Аккаунт с ней уже есть, второй не нужен.`,
        instruction:
            "Войдите со своим паролем. Не помните пароль — на странице входа нажмите «Забыли пароль?».",
        buttonText: "Войти",
        ignoreText:
            "Если это были не вы, просто проигнорируйте письмо: в аккаунте ничего не изменилось.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Все права защищены.`,
    },
    es: {
        preview: `Ya tienes una cuenta de ${MAIL_BRAND_NAME}`,
        heading: "Ya tienes una cuenta",
        intro: `Alguien —quizá tú— intentó registrarse en ${MAIL_BRAND_NAME} con este correo. Ya existe una cuenta con él; no hace falta otra.`,
        instruction:
            "Entra con tu contraseña. Si no la recuerdas, pulsa «¿Olvidaste la contraseña?» en la página de acceso.",
        buttonText: "Entrar",
        ignoreText: "Si no has sido tú, ignora este mensaje: tu cuenta no ha cambiado.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. Todos los derechos reservados.`,
    },
    en: {
        preview: `You already have a ${MAIL_BRAND_NAME} account`,
        heading: "You already have an account",
        intro: `Someone — maybe you — tried to sign up to ${MAIL_BRAND_NAME} with this email. An account with it already exists, so there is no need for another one.`,
        instruction:
            "Sign in with your password. If you do not remember it, press “Forgot password?” on the sign-in page.",
        buttonText: "Sign in",
        ignoreText: "If it was not you, ignore this message: nothing changed in your account.",
        copyright: (year) => `© ${year} ${MAIL_BRAND_NAME}. All rights reserved.`,
    },
};

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

export const VERIFICATION_EMAIL_TEXTS: Record<Language, VerificationEmailTexts> = {
    ru: {
        preview: "Верификация почты на April",
        heading: "Верификация почты",
        greeting: (name: string, surname: string) =>
            `Привет, ${name} ${surname}! Мы получили запрос на верификацию вашей почты.`,
        instruction:
            "Нажмите на кнопку ниже, чтобы подтвердить ваш адрес электронной почты. Ссылка действительна в течение 1 часа.",
        buttonText: "Подтвердить почту",
        ignoreText: "Если вы не запрашивали верификацию почты, просто проигнорируйте это письмо.",
        copyright: (year: number) => `© ${year} April. Все права защищены.`,
    },
    es: {
        preview: "Verificación de correo en April",
        heading: "Verificación de correo",
        greeting: (name: string, surname: string) =>
            `¡Hola, ${name} ${surname}! Hemos recibido una solicitud para verificar tu correo electrónico.`,
        instruction:
            "Haz clic en el botón de abajo para confirmar tu dirección de correo electrónico. El enlace es válido por 1 hora.",
        buttonText: "Confirmar correo",
        ignoreText:
            "Si no solicitaste la verificación del correo, simplemente ignora este mensaje.",
        copyright: (year: number) => `© ${year} April. Todos los derechos reservados.`,
    },
    en: {
        preview: "Email verification on April",
        heading: "Email Verification",
        greeting: (name: string, surname: string) =>
            `Hello, ${name} ${surname}! We received a request to verify your email address.`,
        instruction:
            "Click the button below to confirm your email address. The link is valid for 1 hour.",
        buttonText: "Confirm Email",
        ignoreText: "If you did not request email verification, please ignore this message.",
        copyright: (year: number) => `© ${year} April. All rights reserved.`,
    },
};

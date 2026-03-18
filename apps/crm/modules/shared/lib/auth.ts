// /**
//  * Утилиты для работы с аутентификацией сотрудников в CRM
//  */

// const ACCESS_TOKEN_KEY_CRM = "access_token_crm";

// /**
//  * Получить access token из localStorage (только на клиенте)
//  */
// export function getAccessToken(): string | null {
//     if (typeof window === "undefined") {
//         return null;
//     }
//     return localStorage.getItem(ACCESS_TOKEN_KEY_CRM);
// }

// /**
//  * Проверить, есть ли токен (только на клиенте)
//  */
// export function hasAccessToken(): boolean {
//     return getAccessToken() !== null;
// }

// /**
//  * Очистить токены (только на клиенте)
//  */
// export function clearTokens(): void {
//     if (typeof window === "undefined") {
//         return;
//     }
//     localStorage.removeItem(ACCESS_TOKEN_KEY_CRM);
//     localStorage.removeItem("refresh_token_crm");
// }

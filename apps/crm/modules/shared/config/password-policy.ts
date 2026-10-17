/**
 * Правило пароля аккаунта — то же, что у API (`IsAccountPassword`): 8–72 символа, строчная,
 * заглавная и цифра. Одно на все формы: регистрацию, сброс, «Вход и безопасность», вступление.
 */
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt учитывает только первые 72 байта: длиннее пароль молча совпал бы с обрезанным. */
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_CHARACTERS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const isValidPassword = (value: string): boolean =>
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_CHARACTERS.test(value);

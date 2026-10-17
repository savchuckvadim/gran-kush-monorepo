import type {
    AccountSecurity,
    SignInMethod,
    SignInProviderKey,
} from "@/modules/entities/cabinet-account";

/** Способ входа провайдера в ответе API; провайдер не настроен и не привязан — его нет. */
export const methodOf = (
    security: AccountSecurity,
    provider: SignInProviderKey
): SignInMethod | undefined => security.methods.find((method) => method.provider === provider);

/** То же правило, что у API: последний способ входа (пароль или провайдер) не снимается. */
export const isLastSignInMethod = (
    security: AccountSecurity,
    provider: SignInProviderKey
): boolean =>
    !security.hasPassword &&
    !security.methods.some((method) => method.provider !== provider && method.linked);

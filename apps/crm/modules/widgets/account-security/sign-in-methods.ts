import type { AccountSecurity, SignInProviderKey } from "@/modules/entities/account-security";

/** То же правило, что у API: последний способ входа (пароль или провайдер) не снимается. */
export const isLastSignInMethod = (
    security: AccountSecurity,
    provider: SignInProviderKey
): boolean =>
    !security.hasPassword &&
    !security.methods.some((method) => method.provider !== provider && method.linked);

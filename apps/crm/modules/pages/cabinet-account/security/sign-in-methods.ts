import type { AccountSecurity } from "@/modules/entities/cabinet-account";

/** То же правило, что у API: последний способ входа (пароль, Google, Telegram) не снимается. */
export const isLastSignInMethod = (
    security: AccountSecurity,
    provider: "google" | "telegram"
): boolean => {
    const other = provider === "google" ? security.telegram.linked : security.google.linked;
    return !security.hasPassword && !other;
};

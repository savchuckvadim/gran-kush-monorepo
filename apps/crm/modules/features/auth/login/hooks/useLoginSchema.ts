import { useTranslations } from "next-intl";

import { z } from "zod";

// The club is not asked for: login is global, the club is picked after it (useLoginSession).
export function useLoginSchema() {
    const t = useTranslations("auth.login");

    return z.object({
        email: z.string().trim().email(t("emailInvalid")),
        password: z.string().min(1, t("passwordRequired")),
    });
}

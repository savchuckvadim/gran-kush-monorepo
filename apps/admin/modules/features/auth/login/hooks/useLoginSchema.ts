import { useTranslations } from "next-intl";

import { z } from "zod";

export function useLoginSchema() {
    const t = useTranslations("auth.login");

    return z.object({
        email: z.string().email(t("emailInvalid")),
        // Как в PlatformLoginDto
        password: z.string().min(6, t("passwordMin")),
    });
}

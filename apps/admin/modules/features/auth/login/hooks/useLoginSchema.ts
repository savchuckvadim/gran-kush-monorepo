import { z } from "zod";

import { getRouteContext } from "@/modules/processes/auth/utils/auth-routing";
// import { useTranslations } from "next-intl";



export function useLoginSchema() {
    //todo: i18n
    // const t = useTranslations("auth.login");

    const loginSchema = z
        .object({
            club: z.string().optional(),
            email: z.string().email("Invalid email"),
            password: z.string().min(8, "Password must be at least 8 characters"),
        })
        .superRefine((value, ctx) => {
            if (!value.club && typeof window !== "undefined") {
                const { portalSlug } = getRouteContext(window.location.pathname);
                if (!portalSlug) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["club"],
                        message: "Club is required",
                    });
                }
            }
        });
    return loginSchema;
}

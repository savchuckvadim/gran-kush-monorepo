"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@workspace/ui";

import { apiTokensStorage } from "@/modules/shared/api";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function CrmLogoutButton({ variant = "default" }: { variant?: "default" | "outline" }) {
    const t = useTranslations("navigation");
    const localizedLink = useLocalizedLink();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();

    const logout = () => {
        apiTokensStorage.clearTokens();
        queryClient.clear();
        const loginUrl = localizedLink(ROUTES.LOGIN);
        if (pathname !== loginUrl) {
            router.replace(loginUrl);
        }
    };

    return (
        <Button variant={variant} className="w-full" onClick={logout}>
            <div className="flex w-full cursor-pointer items-center justify-center gap-2">
                <span>{t("logout")}</span>
                <LogOut className="ml-2 size-4" />
            </div>
        </Button>
    );
}

'use client';

import { Button } from "@workspace/ui";

import { useLogout } from "@/modules/entities/auth";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

export function LogoutButton({variant = "default"}: {variant?: "default" | "outline"}) {
    const { logout } = useLogout();
    const t = useTranslations("profile");
    return (
        <Button variant={variant} className="w-full" onClick={logout}>
            <div className="flex items-center flex-row gap-2 cursor-pointer w-full justify-center">
                <span>{t("nav.logout")}</span> <LogOut className="size-4 ml-2" />
            </div>
        </Button>
    );
}
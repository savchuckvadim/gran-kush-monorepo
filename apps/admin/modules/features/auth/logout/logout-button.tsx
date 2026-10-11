"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@workspace/ui";

import { logoutPlatformAdmin } from "@/modules/entities/auth";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

export function LogoutButton() {
    const t = useTranslations("navigation");
    const router = useRouter();
    const queryClient = useQueryClient();
    const localizedLink = useLocalizedLink();

    const mutation = useMutation({
        mutationFn: logoutPlatformAdmin,
        onSettled: () => {
            queryClient.clear();
            router.replace(localizedLink(ROUTES.LOGIN));
        },
    });

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
        >
            <LogOut />
            {t("logout")}
        </Button>
    );
}

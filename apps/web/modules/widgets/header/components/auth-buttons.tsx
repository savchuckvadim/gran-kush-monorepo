"use client";
import Link from "next/link";

import { Button } from "@workspace/ui";

import { useAuth } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { LogoutButton } from "./logout-button";

interface AuthButtonsProps {
    loginLabel: string;
    registerLabel: string;
}

export function AuthButtons({ loginLabel, registerLabel }: AuthButtonsProps) {
    const localizedLink = useLocalizedLink();
    const { isProtected, isAuthenticated } = useAuth();
  
    if (!isProtected && isAuthenticated) {
        return (
            <div className="flex items-center gap-2" role="group" aria-label="Authentication">
                <Button variant="ghost" asChild>
                    <Link href={localizedLink(ROUTES.PROFILE)}>Profile</Link>
                </Button>
            </div>
        );
    }

    if (isProtected && isAuthenticated) {
        return (
            <LogoutButton />
        );
    }

    return (
        <div className="flex items-center gap-2" role="group" aria-label="Authentication">
            <Button variant="ghost" asChild>
                <Link href={localizedLink(ROUTES.LOGIN)}>{loginLabel}</Link>
            </Button>
            <Button asChild>
                <Link href={localizedLink(ROUTES.REGISTER)}>{registerLabel}</Link>
            </Button>
        </div>
    );
}

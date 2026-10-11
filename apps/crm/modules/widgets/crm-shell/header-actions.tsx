"use client";

import { useTranslations } from "next-intl";

import { ThemeToggle } from "@workspace/ui";

import { LangSwitcher, SkinPickerDialog } from "@/modules/features";
import { PortalSwitcher } from "@/modules/widgets/portal-switcher";

import { UserButton } from "./user-button";

interface HeaderActionsProps {
    /** `bar` — the header row from md up; `drawer` — the same controls stacked in the mobile menu. */
    variant: "bar" | "drawer";
    onNavigate?: () => void;
}

export function HeaderActions({ variant, onNavigate }: HeaderActionsProps) {
    const tAppearance = useTranslations("crm.appearance");

    if (variant === "drawer") {
        return (
            <div className="space-y-2 border-t pt-3">
                <UserButton variant="drawer" onNavigate={onNavigate} />
                <PortalSwitcher align="start" />
                <div className="flex items-center gap-1">
                    <LangSwitcher align="start" />
                    <SkinPickerDialog />
                    <ThemeToggle forcedHint={tAppearance("mode.single")} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 lg:gap-4">
            <PortalSwitcher />
            <LangSwitcher />
            <SkinPickerDialog />
            <ThemeToggle forcedHint={tAppearance("mode.single")} />
            <UserButton variant="bar" />
        </div>
    );
}

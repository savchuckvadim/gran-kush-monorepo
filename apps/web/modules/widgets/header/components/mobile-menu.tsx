"use client";

import { useEffect, useRef } from "react";

import { Menu, X } from "lucide-react";

import { Button } from "@workspace/ui";

import { NavigationTranslationKey } from "@/modules/shared/config/i18n/types";

import { NavigationItem as NavigationItemComponent } from "../../navigation/components/navigation-item";

import { AuthButtons } from "./auth-buttons";
import { HeaderActions } from "./header-actions";

interface NavigationItem {
    key: NavigationTranslationKey;
    href: string;
    label: string;
}

interface MobileMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    navigationItems: NavigationItem[];
    loginLabel: string;
    registerLabel: string;
    currentPath: string;
}

export function MobileMenu({
    isOpen,
    onToggle,
    navigationItems,
    loginLabel,
    registerLabel,
    currentPath,
}: MobileMenuProps) {
    const lastPathRef = useRef<string>(currentPath);

    // Close mobile menu after any navigation (login/logout/profile/etc).
    useEffect(() => {
        if (!isOpen) {
            lastPathRef.current = currentPath;
            return;
        }

        if (lastPathRef.current !== currentPath) {
            onToggle(); // flips open -> closed
            lastPathRef.current = currentPath;
        }
    }, [currentPath, isOpen, onToggle]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Burger Button */}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onToggle}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
            >
                {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </Button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Menu */}
            {isOpen && (
                <div className="fixed top-16 left-0 right-0 z-50 h-[calc(100vh-4rem)] border-b bg-background md:hidden">
                    <nav
                        className="flex h-full flex-col gap-6 overflow-y-auto p-6"
                        aria-label="Mobile navigation"
                    >
                        {/* Header Actions */}
                        <div className="flex flex-col gap-4">
                            <HeaderActions />
                        </div>
                        {/* Divider */}
                        <div className="border-t" />
                        {/* Navigation Items */}
                        <ul className="flex flex-col gap-4">
                            {navigationItems.map((item) => (
                                <li key={item.key} onClick={onToggle}>
                                    <NavigationItemComponent
                                        href={item.href}
                                        label={item.label}
                                        isActive={currentPath === item.href}
                                    />
                                </li>
                            ))}
                        </ul>

                        {/* Divider */}
                        <div className="border-t" />

                        {/* Auth Buttons */}
                        <div className="flex flex-col gap-2 [&_div]:flex-col [&_div]:w-full [&_button]:w-full">
                            <AuthButtons loginLabel={loginLabel} registerLabel={registerLabel} />
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}

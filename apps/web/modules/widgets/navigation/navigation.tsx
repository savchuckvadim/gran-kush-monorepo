"use client";

import { usePathname } from "next/navigation";

import { NavigationTranslationKey } from "@/modules/shared/config/i18n/types";

import { NavigationItem } from "./components/navigation-item";

interface NavigationLinkItem {
    key: NavigationTranslationKey;
    href: string;
    label: string;
}

interface NavigationProps {
    items: NavigationLinkItem[];
}

export function Navigation({ items }: NavigationProps) {
    const pathname = usePathname();

    return (
        <nav className="hidden md:block" aria-label="Main navigation">
            <ul className="flex items-center gap-6">
                {items.map((item: NavigationLinkItem) => (
                    <li key={item.key}>
                        <NavigationItem
                            href={item.href}
                            label={item.label}
                            isActive={pathname === item.href}
                        />
                    </li>
                ))}
            </ul>
        </nav>
    );
}

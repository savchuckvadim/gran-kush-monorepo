"use client";

import type { ReactNode } from "react";

import { BurgerButton } from "@/modules/shared/ui/Burger";
import { useSidebar } from "@/modules/shared/ui/Sidebar";

interface AppHeaderProps {
    /** Слева после бургера: переключатель клуба, раздел */
    start: ReactNode;
    /** Справа: поиск, действия, оформление, меню аккаунта */
    end: ReactNode;
    labels: { openMenu: string; closeMenu: string };
}

/** Шапка приложения: бургер сайдбара на телефоне, слоты слева и справа. */
export function AppHeader({ start, end, labels }: AppHeaderProps) {
    const { isOpen, toggle } = useSidebar();

    return (
        <header
            data-slot="app-header"
            className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 px-2 md:gap-2 md:px-4"
        >
            {/* burger.css sets display on the button itself, so the breakpoint lives on a wrapper */}
            <div className="flex md:hidden">
                <BurgerButton
                    isOpen={isOpen}
                    onToggle={toggle}
                    openLabel={labels.openMenu}
                    closeLabel={labels.closeMenu}
                />
            </div>
            {start}
            <div className="ml-auto flex items-center gap-0.5 md:gap-1.5">{end}</div>
        </header>
    );
}

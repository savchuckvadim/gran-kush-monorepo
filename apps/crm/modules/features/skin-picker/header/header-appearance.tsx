"use client";

import { cn } from "@workspace/ui/lib/utils";

import { HeaderEcoToggle } from "./header-eco-toggle";
import { HeaderSkinButton } from "./header-skin-button";
import { HeaderThemeToggle } from "./header-theme-toggle";

/**
 * Оформление в шапке — одна кнопка тем (разноцветный кружок). Наведение или фокус выдвигают слева
 * от неё светлый/тёмный режим и энергосбережение; на сенсорном экране навести нечем, там они видны
 * сразу. На телефоне в шапке остаётся только светлый/тёмный режим: темы и энергосбережение живут
 * в карточке аккаунта.
 */
export function HeaderAppearance() {
    return (
        <div data-slot="header-appearance" className="group/appearance flex items-center">
            <div
                className={cn(
                    "flex items-center",
                    "sm:pointer-fine:max-w-0 sm:pointer-fine:overflow-hidden sm:pointer-fine:opacity-0",
                    "sm:pointer-fine:transition-[max-width,opacity] sm:pointer-fine:delay-300 sm:pointer-fine:duration-200",
                    "sm:pointer-fine:group-hover/appearance:max-w-20 sm:pointer-fine:group-hover/appearance:opacity-100 sm:pointer-fine:group-hover/appearance:delay-0",
                    "sm:pointer-fine:group-focus-within/appearance:max-w-20 sm:pointer-fine:group-focus-within/appearance:opacity-100 sm:pointer-fine:group-focus-within/appearance:overflow-visible sm:pointer-fine:group-focus-within/appearance:delay-0"
                )}
            >
                <HeaderEcoToggle className="hidden sm:inline-flex" />
                <HeaderThemeToggle />
            </div>
            <HeaderSkinButton className="hidden sm:inline-flex" />
        </div>
    );
}

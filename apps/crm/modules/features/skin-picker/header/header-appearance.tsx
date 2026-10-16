"use client";

import { HeaderEcoToggle } from "./header-eco-toggle";
import { HeaderSkinButton } from "./header-skin-button";
import { HeaderThemeToggle } from "./header-theme-toggle";

/**
 * Оформление в шапке: светлый/тёмный режим, темы, энергосбережение. На телефоне скрыто — там
 * оформление живёт в карточке аккаунта, а шапка оставляет место для главного.
 */
export function HeaderAppearance() {
    return (
        <div className="hidden items-center sm:flex">
            <HeaderThemeToggle />
            <HeaderSkinButton />
            <HeaderEcoToggle />
        </div>
    );
}

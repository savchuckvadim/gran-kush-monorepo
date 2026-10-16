"use client";

import { useEffect, useEffectEvent, useRef } from "react";

/** Виджет Telegram Login: скрипт Telegram рисует кнопку во фрейме oauth.telegram.org. */
const WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";

/** Имя глобального колбэка виджета: он вызывает функцию по имени из `data-onauth`. */
const CALLBACK = "__pafpafTelegramAuth";

export interface TelegramWidgetPayload {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

type CallbackHost = Window & { [CALLBACK]?: (user: TelegramWidgetPayload) => void };

interface TelegramLoginButtonProps {
    /** Имя бота без @ — у бота в @BotFather задан домен этой страницы (`/setdomain`) */
    botUsername: string;
    locale: string;
    onAuth: (user: TelegramWidgetPayload) => void;
}

/**
 * Кнопка «Войти через Telegram». Ответ виджета подписан ботом и уходит на API как есть; виджет
 * спрашивает разрешение боту писать человеку — так клуб потом пишет ему в Telegram. На странице
 * одна такая кнопка: колбэк у виджета глобальный.
 */
export function TelegramLoginButton({ botUsername, locale, onAuth }: TelegramLoginButtonProps) {
    const host = useRef<HTMLDivElement>(null);
    const handleAuth = useEffectEvent(onAuth);

    useEffect(() => {
        const node = host.current;
        if (!node) return;
        const target = window as CallbackHost;
        target[CALLBACK] = (user) => handleAuth(user);

        const script = document.createElement("script");
        script.src = WIDGET_SRC;
        script.async = true;
        script.dataset.telegramLogin = botUsername;
        script.dataset.size = "large";
        script.dataset.radius = "10";
        script.dataset.userpic = "false";
        script.dataset.requestAccess = "write";
        script.dataset.lang = locale;
        script.dataset.onauth = `${CALLBACK}(user)`;
        node.replaceChildren(script);

        return () => {
            node.replaceChildren();
            delete target[CALLBACK];
        };
    }, [botUsername, locale]);

    return <div ref={host} className="flex min-h-10 justify-center" />;
}

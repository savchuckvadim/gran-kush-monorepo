"use client";

import { type ComponentProps, useEffect, useState } from "react";

import { Button } from "@workspace/ui";

import { TelegramMark } from "./telegram-mark";

/** Скрипт виджета Telegram: из него нужен только `Telegram.Login.auth` — окно входа без фрейма. */
const WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";

export interface TelegramWidgetPayload {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface TelegramLogin {
    auth: (
        options: { bot_id: number; request_access?: "write"; lang?: string },
        callback: (user: TelegramWidgetPayload | false) => void
    ) => void;
}

type TelegramHost = Window & { Telegram?: { Login?: TelegramLogin } };

let widgetScript: Promise<TelegramLogin> | null = null;

/** Скрипт грузится один раз на вкладку; после ошибки следующая кнопка пробует снова. */
const loadTelegramLogin = (): Promise<TelegramLogin> => {
    widgetScript ??= new Promise<TelegramLogin>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = WIDGET_SRC;
        script.async = true;
        script.onload = () => {
            const login = (window as TelegramHost).Telegram?.Login;
            if (login) resolve(login);
            else reject(new Error("Telegram Login is unavailable"));
        };
        script.onerror = () => reject(new Error("Telegram widget failed to load"));
        document.head.append(script);
    }).catch((error: unknown) => {
        widgetScript = null;
        throw error;
    });
    return widgetScript;
};

interface TelegramLoginButtonProps {
    /** Числовой id бота; у бота в @BotFather задан домен этой страницы (`/setdomain`) */
    botId: number;
    locale: string;
    label: string;
    size?: ComponentProps<typeof Button>["size"];
    className?: string;
    disabled?: boolean;
    onAuth: (user: TelegramWidgetPayload) => void;
}

/**
 * Кнопка «Войти через Telegram» в стиле остальных кнопок: родной виджет рисуется во фрейме
 * Telegram, и его не оформить. Клик открывает окно oauth.telegram.org; подписанный ботом ответ
 * уходит на API как есть. Окно просит разрешение боту писать человеку — так клуб потом пишет ему
 * в Telegram. Пока скрипт не загрузился (или его заблокировали), кнопка неактивна: окно должно
 * открыться прямо в обработчике клика, иначе браузер его заблокирует.
 */
export function TelegramLoginButton({
    botId,
    locale,
    label,
    size,
    className,
    disabled,
    onAuth,
}: TelegramLoginButtonProps) {
    const [login, setLogin] = useState<TelegramLogin | null>(null);

    useEffect(() => {
        let alive = true;
        loadTelegramLogin()
            .then((value) => {
                if (alive) setLogin(value);
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, []);

    return (
        <Button
            type="button"
            variant="outline"
            size={size}
            className={className}
            disabled={disabled || !login}
            onClick={() =>
                login?.auth({ bot_id: botId, request_access: "write", lang: locale }, (user) => {
                    if (user) onAuth(user);
                })
            }
        >
            <TelegramMark />
            {label}
        </Button>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { StatusCard } from "@/modules/shared/ui/StatusCard";

/** Через сколько секунд киоск сам возвращает пустую анкету для следующего человека. */
export const KIOSK_RESET_SECONDS = 15;

interface JoinDoneProps {
    club: string;
    /** Аккаунт заведён этой анкетой: человеку надо подтвердить почту. */
    accountCreated: boolean;
    /** Киоск: обратный отсчёт и кнопка «Следующий» вместо того, чтобы оставить данные на экране. */
    kiosk: boolean;
    onNext: () => void;
}

/** Анкета отправлена. На общем планшете итог сам сменяется пустой анкетой. */
export function JoinDone({ club, accountCreated, kiosk, onNext }: JoinDoneProps) {
    const t = useTranslations("join");
    const [secondsLeft, setSecondsLeft] = useState(KIOSK_RESET_SECONDS);

    useEffect(() => {
        if (!kiosk) return;
        if (secondsLeft <= 0) {
            onNext();
            return;
        }
        const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [kiosk, secondsLeft, onNext]);

    return (
        <StatusCard
            tone="success"
            title={t("done.title")}
            text={t(accountCreated ? "done.checkEmail" : "done.existing", { club })}
        >
            {kiosk && (
                <div className="space-y-2">
                    <Button className="w-full" onClick={onNext}>
                        {t("kiosk.next")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        {t("kiosk.resetIn", { seconds: secondsLeft })}
                    </p>
                </div>
            )}
        </StatusCard>
    );
}

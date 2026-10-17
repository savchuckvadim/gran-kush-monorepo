"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

const MINUTE = 60_000;

/** One ticker for the whole page: it fires on minute boundaries, not every second. */
const minuteStore = (() => {
    const listeners = new Set<() => void>();
    let timer: number | undefined;
    let minute = 0;

    const tick = () => {
        minute = Math.floor(Date.now() / MINUTE) * MINUTE;
        listeners.forEach((listener) => listener());
        timer = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE) + 50);
    };

    return {
        subscribe(listener: () => void) {
            listeners.add(listener);
            if (listeners.size === 1) tick();
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) window.clearTimeout(timer);
            };
        },
        getSnapshot: () => minute || Math.floor(Date.now() / MINUTE) * MINUTE,
        getServerSnapshot: () => 0,
    };
})();

/** Time and today's date in the interface language, inside the account capsule. */
export function HeaderClock({ className }: { className?: string }) {
    const locale = useLocale();
    const minute = useSyncExternalStore(
        minuteStore.subscribe,
        minuteStore.getSnapshot,
        minuteStore.getServerSnapshot
    );
    // the server does not know the viewer's time zone: it renders an empty slot of the same size
    const now = minute ? new Date(minute) : null;

    return (
        <span
            data-slot="header-clock"
            aria-hidden={now ? undefined : true}
            className={cn("flex min-w-12 flex-col items-end leading-none tabular-nums", className)}
        >
            <span className="text-sm font-semibold">
                {now
                    ? new Intl.DateTimeFormat(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                      }).format(now)
                    : " "}
            </span>
            <span
                data-slot="header-clock-date"
                className="text-muted-foreground mt-0.5 text-[0.625rem]"
            >
                {now
                    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
                          now
                      )
                    : " "}
            </span>
        </span>
    );
}

"use client";

import * as React from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { readJsonFromCookie, writeJsonToCookie } from "../../lib/entity-list-prefs-cookie";

import { useEntityCardContextOptional } from "./entity-card-context";

const SECTIONS_SUFFIX = ":entityCardSections";

function readExpandedMap(cookieKey: string): Record<string, boolean> {
    return readJsonFromCookie<Record<string, boolean>>(`${cookieKey}${SECTIONS_SUFFIX}`, {});
}

function writeExpandedMap(cookieKey: string, map: Record<string, boolean>) {
    writeJsonToCookie(`${cookieKey}${SECTIONS_SUFFIX}`, map);
}

export interface EntityCardSectionProps {
    id: string;
    title: React.ReactNode;
    /** Развёрнута по умолчанию; при наличии cookie значение из cookie перекрывает после гидрации */
    defaultExpanded?: boolean;
    /**
     * Ключ для сохранения состояния разделов в cookie (общий на карточку).
     * Можно задать на `EntityCard` (`sectionsCollapseCookieKey`) — тогда здесь не обязательно.
     */
    persistCollapseCookieKey?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** Слот под кастомный триггер справа от заголовка */
    headerExtra?: React.ReactNode;
}

export function EntityCardSection({
    id,
    title,
    defaultExpanded = true,
    persistCollapseCookieKey: persistKeyProp,
    badge,
    children,
    className,
    headerExtra,
}: EntityCardSectionProps) {
    const rootCtx = useEntityCardContextOptional();
    const persistKey = persistKeyProp ?? rootCtx?.sectionsCollapseCookieKey;

    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const hydrated = React.useRef(false);

    React.useLayoutEffect(() => {
        if (!persistKey || hydrated.current) return;
        hydrated.current = true;
        const map = readExpandedMap(persistKey);
        if (typeof map[id] === "boolean") {
            setExpanded(map[id]);
        }
    }, [id, persistKey]);

    const toggle = React.useCallback(() => {
        setExpanded((prev) => {
            const next = !prev;
            if (persistKey && typeof document !== "undefined") {
                const map = readExpandedMap(persistKey);
                map[id] = next;
                writeExpandedMap(persistKey, map);
            }
            return next;
        });
    }, [id, persistKey]);

    return (
        <section
            className={cn(
                "rounded-lg border border-border/70 bg-muted/10 shadow-sm",
                className
            )}
        >
            <div className="flex items-stretch gap-0 border-b border-border/50">
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`entity-card-section-${id}`}
                    onClick={toggle}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/30"
                >
                    <ChevronDown
                        className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                            expanded ? "rotate-0" : "-rotate-90"
                        )}
                        aria-hidden
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                        {title}
                    </span>
                    {badge ? (
                        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground">{badge}</span>
                    ) : null}
                </button>
                {headerExtra ? (
                    <div className="flex shrink-0 items-center border-l border-border/50 px-2">
                        {headerExtra}
                    </div>
                ) : null}
            </div>
            {expanded ? (
                <div
                    id={`entity-card-section-${id}`}
                    className="space-y-0 px-2.5 py-2"
                >
                    {children}
                </div>
            ) : null}
        </section>
    );
}

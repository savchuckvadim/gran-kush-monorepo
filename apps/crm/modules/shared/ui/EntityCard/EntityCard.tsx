"use client";

import * as React from "react";

import { Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { readBooleanFromCookie, writeBooleanToCookie } from "../../lib/entity-list-prefs-cookie";

import { EntityCardContext } from "./entity-card-context";

const TIMELINE_COOKIE_PREFIX = "entityCardTimeline:";

export type EntityCardTimelineHiddenBehavior = "expand-main" | "keep-column";

export interface EntityCardProps {
    /** Крупный заголовок сущности */
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Кнопки слева от «Сохранить» / переключателя таймлайна */
    headerTrailing?: React.ReactNode;
    /** Основная колонка: секции и поля */
    children: React.ReactNode;

    /** Правая колонка — таймлайн и т.п. */
    timeline?: React.ReactNode;
    timelineLabel?: React.ReactNode;
    /** Когда таймлайн скрыт и `timelineHiddenBehavior === "keep-column"` */
    timelineHiddenPlaceholder?: React.ReactNode;
    timelineHiddenBehavior?: EntityCardTimelineHiddenBehavior;
    defaultTimelineVisible?: boolean;
    timelineVisible?: boolean;
    onTimelineVisibleChange?: (visible: boolean) => void;
    timelineVisibilityCookieKey?: string;

    dirty?: boolean;
    onSave?: () => void | Promise<void>;
    saving?: boolean;
    saveLabel?: React.ReactNode;

    /** Сохранение свёрнутости секций (`EntityCardSection`) одним картой в cookie */
    sectionsCollapseCookieKey?: string;

    className?: string;
    /** Оболочка: позиция и z-index относительно шаблона */
    shellClassName?: string;
    /**
     * Фиксированная высота блока; скролл только внутри панелей.
     * По умолчанию крупный блок (~выше типичного sticky-хедера по высоте вьюпорта).
     */
    contentHeightClassName?: string;
}

export function EntityCard({
    title,
    subtitle,
    headerTrailing,
    children,
    timeline,
    timelineLabel = "Хронология",
    timelineHiddenPlaceholder = "Панель скрыта. Включите её кнопкой справа в шапке.",
    timelineHiddenBehavior = "expand-main",
    defaultTimelineVisible = true,
    timelineVisible: timelineVisibleControlled,
    onTimelineVisibleChange,
    timelineVisibilityCookieKey,
    dirty = false,
    onSave,
    saving = false,
    saveLabel = "Сохранить",
    sectionsCollapseCookieKey,
    className,
    shellClassName,
    contentHeightClassName = "h-[min(88dvh,56rem)] max-h-[90dvh]",
}: EntityCardProps) {
    const hasTimeline = Boolean(timeline);
    const timelineControlled =
        typeof timelineVisibleControlled === "boolean" && typeof onTimelineVisibleChange === "function";

    const [timelineOpen, setTimelineOpenInternal] = React.useState(defaultTimelineVisible);
    const timelineHydrated = React.useRef(false);

    React.useLayoutEffect(() => {
        if (timelineControlled) return;
        if (!timelineVisibilityCookieKey || timelineHydrated.current) return;
        timelineHydrated.current = true;
        const v = readBooleanFromCookie(
            `${TIMELINE_COOKIE_PREFIX}${timelineVisibilityCookieKey}`,
            defaultTimelineVisible
        );
        setTimelineOpenInternal(v);
    }, [defaultTimelineVisible, timelineControlled, timelineVisibilityCookieKey]);

    const timelineVisible = timelineControlled ? timelineVisibleControlled : timelineOpen;

    const setTimelineVisible = React.useCallback(
        (next: boolean) => {
            if (timelineControlled) {
                onTimelineVisibleChange!(next);
            } else {
                setTimelineOpenInternal(next);
                if (timelineVisibilityCookieKey && typeof document !== "undefined") {
                    writeBooleanToCookie(
                        `${TIMELINE_COOKIE_PREFIX}${timelineVisibilityCookieKey}`,
                        next
                    );
                }
            }
        },
        [onTimelineVisibleChange, timelineControlled, timelineVisibilityCookieKey]
    );

    const mainColSpan =
        hasTimeline && timelineVisible
            ? "lg:col-span-4"
            : hasTimeline && !timelineVisible && timelineHiddenBehavior === "keep-column"
              ? "lg:col-span-4"
              : "lg:col-span-7";

    const timelineColSpan = "lg:col-span-3";

    const showSave = Boolean(onSave) && dirty;

    const timelineAsideShown =
        timelineVisible ||
        (!timelineVisible && timelineHiddenBehavior === "keep-column");

    const handleSave = React.useCallback(() => {
        void onSave?.();
    }, [onSave]);

    const ctxValue = React.useMemo(
        () => ({ sectionsCollapseCookieKey }),
        [sectionsCollapseCookieKey]
    );

    return (
        <EntityCardContext.Provider value={ctxValue}>
            <div
                className={cn(
                    "relative z-[38] w-full max-w-[1600px] isolate",
                    shellClassName,
                    className
                )}
            >
                <div
                    className={cn(
                        "flex w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl ring-1 ring-black/5 dark:ring-white/10",
                        contentHeightClassName
                    )}
                >
                    <header className="flex shrink-0 flex-col gap-2 border-b border-border/70 bg-card/95 px-3 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                                {title}
                            </h1>
                            {subtitle ? (
                                <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[42rem]">
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {headerTrailing}
                            {hasTimeline ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() => setTimelineVisible(!timelineVisible)}
                                    aria-pressed={timelineVisible}
                                    aria-label={
                                        timelineVisible ? "Скрыть панель справа" : "Показать панель справа"
                                    }
                                >
                                    {timelineVisible ? (
                                        <PanelRightClose className="size-3.5" />
                                    ) : (
                                        <PanelRightOpen className="size-3.5" />
                                    )}
                                    <span className="hidden sm:inline">{timelineLabel}</span>
                                </Button>
                            ) : null}
                            {showSave ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={saving}
                                    onClick={handleSave}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                            …
                                        </>
                                    ) : (
                                        saveLabel
                                    )}
                                </Button>
                            ) : null}
                        </div>
                    </header>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-7">
                        <div
                            className={cn(
                                "flex min-h-0 min-w-0 flex-col border-border/60 lg:border-r",
                                mainColSpan
                            )}
                        >
                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 sm:px-3 sm:py-3">
                                <div className="flex flex-col gap-2">{children}</div>
                            </div>
                        </div>

                        {hasTimeline ? (
                            <aside
                                className={cn(
                                    "min-h-0 min-w-0 flex-col border-t border-border/60 bg-muted/5 lg:border-t-0",
                                    timelineColSpan,
                                    timelineAsideShown ? "flex" : "hidden"
                                )}
                            >
                                {timelineVisible ? (
                                    <>
                                        <div className="shrink-0 border-b border-border/50 px-2 py-1.5 lg:hidden">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                {timelineLabel}
                                            </span>
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-2.5">
                                            {timeline}
                                        </div>
                                    </>
                                ) : timelineHiddenBehavior === "keep-column" ? (
                                    <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center">
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            {timelineHiddenPlaceholder}
                                        </p>
                                    </div>
                                ) : null}
                            </aside>
                        ) : null}
                    </div>
                </div>
            </div>
        </EntityCardContext.Provider>
    );
}

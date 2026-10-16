"use client";

import * as React from "react";

import { Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { EntityListCardField } from "../EntityList";

export function EntityListCardsView<T>({
    items,
    getRowKey,
    visibleFields,
    cardTitle,
    cardAvatar,
    isCardClickable,
    onCardClick,
    renderCardActions,
}: {
    items: T[];
    getRowKey: (item: T) => string;
    visibleFields: EntityListCardField<T>[];
    cardTitle?: (item: T) => React.ReactNode;
    /** An avatar turns cards into small centred tiles: portrait, name, then the chosen fields. */
    cardAvatar?: (item: T) => React.ReactNode;
    isCardClickable?: boolean;
    onCardClick?: (item: T) => void;
    renderCardActions?: (item: T) => React.ReactNode;
}) {
    const clickable = Boolean(onCardClick && isCardClickable);
    const tile = Boolean(cardAvatar);

    return (
        <div
            className={cn(
                "grid gap-3",
                tile
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}
        >
            {items.map((item) => {
                const rowKey = getRowKey(item);
                return (
                    <Card
                        key={rowKey}
                        className={cn(
                            clickable && "cursor-pointer hover:bg-muted/30",
                            tile && "min-h-44 justify-center py-4 text-center"
                        )}
                        onClick={clickable ? () => onCardClick?.(item) : undefined}
                        role={clickable ? "button" : undefined}
                        tabIndex={clickable ? 0 : -1}
                        onKeyDown={(e) => {
                            if (!clickable) return;
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onCardClick?.(item);
                            }
                        }}
                    >
                        {tile ? (
                            <div className="flex w-full min-w-0 flex-col items-center gap-2 px-3">
                                {cardAvatar?.(item)}
                                {cardTitle && (
                                    <div className="w-full min-w-0 truncate text-base font-semibold">
                                        {cardTitle(item)}
                                    </div>
                                )}
                                <div className="w-full min-w-0 space-y-0.5">
                                    {visibleFields.map((field) => (
                                        <div
                                            key={field.key}
                                            title={
                                                typeof field.label === "string"
                                                    ? field.label
                                                    : undefined
                                            }
                                            className="truncate text-sm text-muted-foreground"
                                        >
                                            <span className="sr-only">{field.label}: </span>
                                            {field.value(item)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {cardTitle && (
                                    <div className="min-w-0 px-4 text-base font-semibold">
                                        {cardTitle(item)}
                                    </div>
                                )}
                                <div className="space-y-2 px-4">
                                    {visibleFields.map((field) => (
                                        <div
                                            key={field.key}
                                            className="flex items-start justify-between gap-3"
                                        >
                                            <div className="text-xs text-muted-foreground">
                                                {field.label}
                                            </div>
                                            <div className="text-sm font-medium text-right">
                                                {field.value(item)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {renderCardActions && (
                            <div
                                className={cn(
                                    "mt-3 flex items-center justify-end gap-2",
                                    !tile && "px-4"
                                )}
                            >
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    {renderCardActions(item)}
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

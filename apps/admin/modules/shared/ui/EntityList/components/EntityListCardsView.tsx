"use client";

import * as React from "react";

import { Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { EntityListCardField } from "../EntityList";

export function EntityListCardsView<T>({
    items,
    getRowKey,
    visibleFields,
    isCardClickable,
    onCardClick,
    renderCardActions,
}: {
    items: T[];
    getRowKey: (item: T) => string;
    visibleFields: EntityListCardField<T>[];
    isCardClickable?: boolean;
    onCardClick?: (item: T) => void;
    renderCardActions?: (item: T) => React.ReactNode;
}) {
    const clickable = Boolean(onCardClick && isCardClickable);

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
                const rowKey = getRowKey(item);
                return (
                    <Card
                        key={rowKey}
                        className={cn(clickable && "cursor-pointer hover:bg-muted/30")}
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

                        {renderCardActions && (
                            <div className="mt-3 flex items-center justify-end gap-2 px-4">
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

"use client";

import * as React from "react";

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui";

export function EntityListVisibilitySettingsDialog({
    isOpen,
    onOpenChange,
    resolvedCardFields,
    resolvedTableColumns,
    visibleCardFieldKeys,
    visibleTableColumnKeys,
    onToggleCardFieldKey,
    onToggleTableColumnKey,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    resolvedCardFields: Array<{ key: string; label: React.ReactNode }>;
    resolvedTableColumns: Array<{ key: string; header: React.ReactNode }>;
    visibleCardFieldKeys: string[];
    visibleTableColumnKeys: string[];
    onToggleCardFieldKey: (key: string) => void;
    onToggleTableColumnKey: (key: string) => void;
}) {
    const showCards = resolvedCardFields.length > 0;
    const showTable = resolvedTableColumns.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Настройка полей
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Поля</DialogTitle>
                    <DialogDescription>
                        Выберите, что показывать в карточках и/или таблице.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {showCards && (
                        <div>
                            <div className="mb-2 text-sm font-medium">Карточки</div>
                            <div className="flex flex-wrap gap-2">
                                {resolvedCardFields.map((field) => {
                                    const active = visibleCardFieldKeys.includes(field.key);
                                    return (
                                        <Button
                                            key={field.key}
                                            type="button"
                                            variant={active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => onToggleCardFieldKey(field.key)}
                                        >
                                            {field.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {showTable && (
                        <div>
                            <div className="mb-2 text-sm font-medium">Таблица</div>
                            <div className="flex flex-wrap gap-2">
                                {resolvedTableColumns.map((col) => {
                                    const active = visibleTableColumnKeys.includes(col.key);
                                    return (
                                        <Button
                                            key={col.key}
                                            type="button"
                                            variant={active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => onToggleTableColumnKey(col.key)}
                                        >
                                            {col.header}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

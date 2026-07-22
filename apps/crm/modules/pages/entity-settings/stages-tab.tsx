"use client";

import { Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { useEntityStageCategories } from "@/modules/entities/entity-settings";

export function StagesTab({ code }: { code: string }) {
    const { data: categories = [], isLoading } = useEntityStageCategories(code);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                У этой сущности нет воронок и стадий.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {categories.map((category) => (
                <Card key={category.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium">{category.name}</h3>
                        {category.isDefault ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                по умолчанию
                            </span>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {category.stages
                            .slice()
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((stage) => (
                                <span
                                    key={stage.id}
                                    className="rounded-md border px-2 py-1 text-xs"
                                    style={
                                        stage.color
                                            ? { borderColor: stage.color, color: stage.color }
                                            : undefined
                                    }
                                >
                                    {stage.name}
                                </span>
                            ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}

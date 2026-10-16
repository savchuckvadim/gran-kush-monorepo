"use client";

import type { SchemaCabinetProductCategoryDto } from "@workspace/api-client/core";
import { cn } from "@workspace/ui/lib/utils";

interface CategoryChipsProps {
    categories: readonly SchemaCabinetProductCategoryDto[];
    selected: string | null;
    onSelect: (categoryId: string | null) => void;
    allLabel: string;
}

/** Фильтр витрины по категории; `null` — все товары. */
export function CategoryChips({ categories, selected, onSelect, allLabel }: CategoryChipsProps) {
    const chips = [{ id: null, name: allLabel }, ...categories];
    return (
        <div role="group" className="flex gap-2 overflow-x-auto pb-1">
            {chips.map((chip) => {
                const active = chip.id === selected;
                return (
                    <button
                        key={chip.id ?? "all"}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onSelect(chip.id)}
                        className={cn(
                            "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                            active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {chip.name}
                    </button>
                );
            })}
        </div>
    );
}

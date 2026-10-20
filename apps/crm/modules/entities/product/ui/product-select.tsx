"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronsUpDown, Package } from "lucide-react";

import {
    Button,
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    Field,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui";

import { useDebouncedValue } from "@/modules/shared";
import { PICKER_COMMAND_CLASS } from "@/modules/shared/ui/picker-command-class";

import { useProducts } from "../hooks";

const RESULTS = 10;
const SEARCH_DEBOUNCE_MS = 200;

/** Выбранный товар: имя, остаток и единица — для подписи и проверок формы. */
export interface ProductChoice {
    id: string;
    name: string;
    currentQuantity: number;
    unitCode: string;
}

interface ProductSelectProps {
    label: string;
    value: ProductChoice | null;
    onChange: (product: ProductChoice) => void;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    /** Показывать и товары без остатка (поставка пополняет и пустой склад) */
    includeOutOfStock?: boolean;
}

/** Поле выбора товара каталога с поиском по названию и артикулу. */
export function ProductSelect({
    label,
    value,
    onChange,
    required,
    error,
    disabled,
    includeOutOfStock = true,
}: ProductSelectProps) {
    const t = useTranslations("crm.productSelect");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
    const products = useProducts(
        { search: search || undefined, isActive: true, limit: RESULTS },
        { enabled: open, keepPrevious: true }
    );
    const items = products.data?.items ?? [];

    return (
        <Field label={label} required={required} error={error}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-invalid={error ? true : undefined}
                        disabled={disabled}
                        className="w-full justify-between font-normal"
                    >
                        {value ? (
                            <span className="truncate">{value.name}</span>
                        ) : (
                            <span className="text-muted-foreground">{t("placeholder")}</span>
                        )}
                        <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-(--radix-popover-trigger-width) min-w-72 p-0"
                >
                    <Command shouldFilter={false} className={PICKER_COMMAND_CLASS}>
                        <CommandInput
                            value={query}
                            onValueChange={setQuery}
                            placeholder={t("search")}
                        />
                        <CommandList>
                            {products.isLoading && (
                                <p className="px-3 py-3 text-sm text-muted-foreground">
                                    {t("searching")}
                                </p>
                            )}
                            {products.isSuccess && items.length === 0 && (
                                <CommandEmpty>{t("empty")}</CommandEmpty>
                            )}
                            {items.map((product) => {
                                const unit = product.measurementUnit?.code ?? "";
                                const inStock = product.currentQuantity > 0;
                                return (
                                    <CommandItem
                                        key={product.id}
                                        value={product.id}
                                        disabled={!includeOutOfStock && !inStock}
                                        onSelect={() => {
                                            onChange({
                                                id: product.id,
                                                name: product.name,
                                                currentQuantity: product.currentQuantity,
                                                unitCode: unit,
                                            });
                                            setOpen(false);
                                        }}
                                    >
                                        <Package />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">{product.name}</span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {t("inStock", {
                                                    quantity: product.currentQuantity,
                                                    unit,
                                                })}
                                            </span>
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </Field>
    );
}

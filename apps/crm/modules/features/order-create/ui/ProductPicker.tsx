"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Package, Plus } from "lucide-react";

import {
    Button,
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui";

import { useProducts } from "@/modules/entities/product";
import { useDebouncedValue, useMoneyFormat } from "@/modules/shared";
import { PICKER_COMMAND_CLASS } from "@/modules/shared/ui/picker-command-class";

import { type DraftProduct, toDraftProduct } from "../model/order-draft";

import { PICKER_DEBOUNCE_MS } from "./picker-command";

const RESULTS = 10;

/** Adds a catalog product to the order; one that is out of stock is shown but cannot be picked. */
export function ProductPicker({
    onPick,
    disabled,
}: {
    onPick: (product: DraftProduct) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("crm.orders.create");
    const money = useMoneyFormat();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const search = useDebouncedValue(query.trim(), PICKER_DEBOUNCE_MS);
    const products = useProducts(
        { search: search || undefined, isActive: true, isConsumable: false, limit: RESULTS },
        { enabled: open, keepPrevious: true }
    );
    const items = products.data?.items ?? [];

    return (
        <Popover
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                if (!value) setQuery("");
            }}
        >
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={disabled}>
                    <Plus aria-hidden="true" />
                    {t("addProduct")}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
                <Command shouldFilter={false} className={PICKER_COMMAND_CLASS}>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder={t("productSearch")}
                    />
                    <CommandList>
                        {products.isLoading && (
                            <p className="px-3 py-3 text-sm text-muted-foreground">
                                {t("searching")}
                            </p>
                        )}
                        {products.isSuccess && items.length === 0 && (
                            <CommandEmpty>{t("productEmpty")}</CommandEmpty>
                        )}
                        {items.map((product) => {
                            const unit = product.measurementUnit?.code ?? "";
                            const inStock = product.isAvailable && product.currentQuantity > 0;
                            return (
                                <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    disabled={!inStock}
                                    onSelect={() => {
                                        onPick(toDraftProduct(product));
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                >
                                    <Package />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{product.name}</span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {inStock
                                                ? t("inStock", {
                                                      quantity: product.currentQuantity,
                                                      unit,
                                                  })
                                                : t("outOfStock")}
                                        </span>
                                    </span>
                                    <span className="font-mono text-xs tabular-nums">
                                        {money(product.price)}
                                    </span>
                                </CommandItem>
                            );
                        })}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

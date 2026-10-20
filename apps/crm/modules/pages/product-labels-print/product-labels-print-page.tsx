"use client";

import { useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQueries } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";

import { Button, FieldInput } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { getProductById, PRODUCT_KEYS } from "@/modules/entities/product";
import { productLabelUrl } from "@/modules/entities/scan";
import { LABEL_FORMATS, LABEL_LIMITS, type LabelRequest } from "@/modules/features/product-labels";
import { useMoneyFormat } from "@/modules/shared";

import { ProductLabel } from "./product-label";

/** Поля листа: A4 под наклейки 70×37 мм (3 × 8) или лента термопринтера 58 мм */
const PAGE_CSS = {
    a4: "@page { size: A4; margin: 10mm 0 0 0; }",
    tape: "@page { size: 58mm 40mm; margin: 0; }",
} as const;

const noSubscribe = () => () => {};

/**
 * Лист QR-этикеток товаров: формат, копии каждого товара и печать браузером. В QR — ссылка на
 * сканер этого клуба с кодом товара; печатается белым по чёрному, независимо от темы CRM.
 */
export function ProductLabelsPrintPage({ request }: { request: LabelRequest }) {
    const t = useTranslations("crm.productLabels");
    const locale = useLocale();
    const { portal } = useParams<{ portal: string }>();
    const money = useMoneyFormat();
    // адрес CRM известен только в браузере: на сервере этикетки не рисуются
    const origin = useSyncExternalStore(
        noSubscribe,
        () => window.location.origin,
        () => ""
    );
    const [format, setFormat] = useState(request.format);
    const [copies, setCopies] = useState(String(request.copies));

    const products = useQueries({
        queries: request.ids.map((id) => ({
            queryKey: PRODUCT_KEYS.detail(id),
            queryFn: () => getProductById(id),
        })),
    });
    const loading = products.some((query) => query.isLoading);
    const count = Math.min(Math.max(Math.trunc(Number(copies)) || 1, 1), LABEL_LIMITS.copies);
    const labels = products.flatMap((query) =>
        query.data ? Array.from({ length: count }, () => query.data) : []
    );

    return (
        <main className="min-h-screen bg-white text-black">
            <style>{PAGE_CSS[format]}</style>
            <div className="flex flex-wrap items-end gap-3 border-b border-neutral-200 p-4 print:hidden">
                <div className="flex gap-1 rounded-md border border-neutral-300 p-1">
                    {LABEL_FORMATS.map((value) => (
                        <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={format === value ? "default" : "ghost"}
                            onClick={() => setFormat(value)}
                        >
                            {t(`formats.${value}`)}
                        </Button>
                    ))}
                </div>
                <div className="w-36">
                    <FieldInput
                        label={t("copies")}
                        type="number"
                        min={1}
                        max={LABEL_LIMITS.copies}
                        value={copies}
                        onChange={(event) => setCopies(event.target.value)}
                    />
                </div>
                <Button
                    type="button"
                    onClick={() => window.print()}
                    disabled={loading || !labels.length}
                >
                    <Printer aria-hidden="true" />
                    {t("print")}
                </Button>
                <p className="text-sm text-neutral-600">{t("total", { count: labels.length })}</p>
            </div>

            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="size-6 animate-spin text-neutral-500" aria-hidden="true" />
                </div>
            )}
            {!loading && labels.length === 0 && (
                <p className="py-20 text-center text-sm text-neutral-600">{t("empty")}</p>
            )}
            {origin && (
                <div
                    className={cn(
                        format === "a4"
                            ? "mx-auto grid w-[210mm] grid-cols-[repeat(3,70mm)] content-start"
                            : "flex flex-col items-center"
                    )}
                >
                    {labels.map((product, index) => (
                        <ProductLabel
                            key={`${product.id}-${index}`}
                            format={format}
                            name={product.name}
                            price={money(product.price)}
                            code={product.code}
                            url={productLabelUrl({ origin, locale, portal, code: product.code })}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}

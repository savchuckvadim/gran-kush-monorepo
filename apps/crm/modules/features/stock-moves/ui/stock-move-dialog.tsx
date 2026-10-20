"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import { type ProductChoice, ProductSelect } from "@/modules/entities/product";
import {
    MANUAL_STOCK_MOVE_REASONS,
    useMoveStock,
    useStockErrorText,
} from "@/modules/entities/stock";

import {
    stockMoveFormSchema,
    type StockMoveFormValues,
    stockMoveFormValues,
    toStockMoveInput,
} from "../model/stock-forms";

const FORM_ID = "stock-move-form";

interface StockMoveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: ProductChoice | null;
}

/** Списание брака, подарок или пересчёт после инвентаризации — всегда с причиной. */
export function StockMoveDialog({ open, onOpenChange, product = null }: StockMoveDialogProps) {
    const t = useTranslations("crm.stock.move");
    const errorText = useStockErrorText();
    const move = useMoveStock();
    const form = useForm<StockMoveFormValues>({
        resolver: zodResolver(stockMoveFormSchema),
        defaultValues: stockMoveFormValues(product),
    });
    const [reason, chosen] = useWatch({ control: form.control, name: ["reason", "product"] });
    const opened = useRef(false);

    useEffect(() => {
        if (open && !opened.current) form.reset(stockMoveFormValues(product));
        opened.current = open;
    }, [open, product, form]);

    const submit = form.handleSubmit((values) =>
        move.mutate(toStockMoveInput(values), {
            onSuccess: (result) => {
                toast.success(
                    t("done", { balance: result.balanceAfter, unit: chosen?.unitCode ?? "" })
                );
                onOpenChange(false);
            },
            onError: (error) => toast.error(errorText(error)),
        })
    );

    const error = (name: keyof StockMoveFormValues) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };
    const unit = chosen?.unitCode ?? "";

    return (
        <ModalDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t("title")}
            description={t("hint")}
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={move.isPending}
                    >
                        {t("cancel")}
                    </Button>
                    <Button type="submit" form={FORM_ID} disabled={move.isPending}>
                        {move.isPending ? t("saving") : t("save")}
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
                <Controller
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                        <ProductSelect
                            label={t("fields.product")}
                            required
                            value={field.value}
                            onChange={field.onChange}
                            error={error("product")}
                        />
                    )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FieldSelect
                                id="move-reason"
                                label={t("fields.reason")}
                                helperText={t(`reasonHint.${field.value}`)}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={MANUAL_STOCK_MOVE_REASONS.map((value) => ({
                                    value,
                                    label: t(`reasons.${value}`),
                                }))}
                            />
                        )}
                    />
                    <FieldInput
                        id="move-quantity"
                        label={
                            reason === "recount"
                                ? t(unit ? "fields.newQuantity" : "fields.newQuantityPlain", {
                                      unit,
                                  })
                                : t(unit ? "fields.quantity" : "fields.quantityPlain", { unit })
                        }
                        helperText={
                            chosen
                                ? t("current", { quantity: chosen.currentQuantity, unit })
                                : undefined
                        }
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min={0}
                        required
                        error={error("quantity")}
                        {...form.register("quantity", { valueAsNumber: true })}
                    />
                </div>
                <FieldInput
                    id="move-note"
                    label={t("fields.note")}
                    placeholder={t("notePlaceholder")}
                    required
                    error={error("note")}
                    {...form.register("note")}
                />
            </form>
        </ModalDialog>
    );
}

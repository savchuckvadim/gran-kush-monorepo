"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import { useCounterparties } from "@/modules/entities/finance";
import { type ProductChoice, ProductSelect } from "@/modules/entities/product";
import { useReceivePurchase, useStockErrorText } from "@/modules/entities/stock";
import { useMoneyFormat } from "@/modules/shared";

import {
    localToday,
    purchaseFormSchema,
    type PurchaseFormValues,
    purchaseFormValues,
    toPurchaseInput,
} from "../model/stock-forms";

const FORM_ID = "purchase-form";

interface PurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Товар уже выбран (из карточки товара) */
    product?: ProductChoice | null;
}

/**
 * Поставка: товар, количество, цена закупки за единицу без налога, при желании поставщик и дата.
 * Приход на склад и расход в учёте записываются вместе.
 */
export function PurchaseDialog({ open, onOpenChange, product = null }: PurchaseDialogProps) {
    const t = useTranslations("crm.stock.purchase");
    const errorText = useStockErrorText();
    const money = useMoneyFormat();
    const counterparties = useCounterparties().data ?? [];
    const receive = useReceivePurchase();
    const form = useForm<PurchaseFormValues>({
        resolver: zodResolver(purchaseFormSchema),
        defaultValues: purchaseFormValues(localToday(), product),
    });
    const [quantity, unitCost, chosen] = useWatch({
        control: form.control,
        name: ["quantity", "unitCost", "product"],
    });
    const total = Number.isFinite(quantity) && Number.isFinite(unitCost) ? quantity * unitCost : 0;
    const opened = useRef(false);

    useEffect(() => {
        if (open && !opened.current) form.reset(purchaseFormValues(localToday(), product));
        opened.current = open;
    }, [open, product, form]);

    const submit = form.handleSubmit((values) =>
        receive.mutate(toPurchaseInput(values), {
            onSuccess: (result) => {
                toast.success(
                    result.ledgerEntryId
                        ? t("doneWithLedger", { quantity: result.stock.currentQuantity })
                        : t("done", { quantity: result.stock.currentQuantity })
                );
                onOpenChange(false);
            },
            onError: (error) => toast.error(errorText(error)),
        })
    );

    const error = (name: keyof PurchaseFormValues) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };

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
                        disabled={receive.isPending}
                    >
                        {t("cancel")}
                    </Button>
                    <Button type="submit" form={FORM_ID} disabled={receive.isPending}>
                        {receive.isPending ? t("saving") : t("save")}
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
                    <FieldInput
                        id="purchase-quantity"
                        label={
                            chosen?.unitCode
                                ? t("fields.quantity", { unit: chosen.unitCode })
                                : t("fields.quantityPlain")
                        }
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min={0}
                        required
                        error={error("quantity")}
                        {...form.register("quantity", { valueAsNumber: true })}
                    />
                    <FieldInput
                        id="purchase-cost"
                        label={t("fields.unitCost")}
                        helperText={t("unitCostHint")}
                        type="number"
                        inputMode="decimal"
                        step="0.0001"
                        min={0}
                        required
                        error={error("unitCost")}
                        {...form.register("unitCost", { valueAsNumber: true })}
                    />
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground tabular-nums">
                    {t("total", { total: money(total) })}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                        control={form.control}
                        name="counterpartyId"
                        render={({ field }) => (
                            <FieldSelect
                                id="purchase-counterparty"
                                label={t("fields.counterparty")}
                                helperText={t("counterpartyHint")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={[
                                    { value: "", label: t("noCounterparty") },
                                    ...counterparties
                                        .filter(
                                            (party) => !party.archivedAt && party.kind !== "member"
                                        )
                                        .map((party) => ({
                                            value: party.id,
                                            label: party.name ?? "",
                                        })),
                                ]}
                            />
                        )}
                    />
                    <FieldInput
                        id="purchase-date"
                        label={t("fields.receivedOn")}
                        type="date"
                        required
                        error={error("receivedOn")}
                        {...form.register("receivedOn")}
                    />
                </div>
            </form>
        </ModalDialog>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Field } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { useMemberDetails } from "@/modules/entities/member";
import { useCreateOrder, useOrderFunnels } from "@/modules/entities/order";
import { ROUTES, useLocalizedLink, useMoneyFormat } from "@/modules/shared";

import {
    draftLineError,
    type DraftMember,
    draftTotal,
    giftsValue,
    newDraftLine,
    type OrderDraftLine,
    toCreateOrderBody,
} from "../model/order-draft";

import { MemberPicker, toDraftMember } from "./MemberPicker";
import { OrderDraftLineRow } from "./OrderDraftLineRow";
import { OrderStageSelect } from "./OrderStageSelect";
import { ProductPicker } from "./ProductPicker";

/**
 * A new order placed by an employee for a member: products from the catalog, own price and
 * gifts per line; managers also pick the stage. After saving, the order card opens — payment
 * and further stages are changed there.
 */
export function CreateOrderForm({ initialMemberId }: { initialMemberId?: string }) {
    const t = useTranslations("crm.orders.create");
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const money = useMoneyFormat();
    const { can } = usePermissions();
    const canChooseStage = can("orders.process");
    const funnels = useOrderFunnels();
    const createOrder = useCreateOrder();

    // undefined — not touched yet: the member from the address (the member card's button) is used
    const [picked, setPicked] = useState<DraftMember | undefined>();
    const prefill = useMemberDetails(picked === undefined ? (initialMemberId ?? "") : "");
    const member = picked ?? (prefill.data ? toDraftMember(prefill.data) : null);

    const [lines, setLines] = useState<OrderDraftLine[]>([]);
    const [notes, setNotes] = useState("");
    const [stageId, setStageId] = useState<string>();
    const [submitted, setSubmitted] = useState(false);

    const busy = createOrder.isPending;
    const total = draftTotal(lines);
    const gifts = giftsValue(lines);
    const lineErrors = lines.map((line) => draftLineError(line, lines));

    const memberError = !submitted
        ? undefined
        : !member
          ? t("memberRequired")
          : !member.isActive
            ? t("memberInactiveError")
            : undefined;
    const linesError = submitted && lines.length === 0 ? t("itemsRequired") : undefined;

    const updateLine = (key: string, patch: Partial<OrderDraftLine>) =>
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));

    const submit = () => {
        setSubmitted(true);
        if (!member?.isActive || lines.length === 0 || lineErrors.some(Boolean)) return;

        createOrder.mutate(
            toCreateOrderBody({
                member,
                lines,
                notes,
                stageId: canChooseStage ? stageId : undefined,
            }),
            {
                onSuccess: (order) => {
                    toast.success(t("created", { number: order.orderNumber }));
                    router.push(localizedLink(`${ROUTES.CRM_ORDER_DETAILS}/${order.id}`));
                },
            }
        );
    };

    return (
        <form
            noValidate
            className="space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {createOrder.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {getApiErrorMessage(createOrder.error)}
                </div>
            )}

            <div className="max-w-xl">
                <MemberPicker
                    value={member}
                    onChange={setPicked}
                    error={memberError}
                    disabled={busy}
                />
            </div>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-medium">{t("items")}</h2>
                    <ProductPicker
                        disabled={busy}
                        onPick={(product) => setLines((prev) => [...prev, newDraftLine(product)])}
                    />
                </div>

                {lines.length > 0 ? (
                    <ul className="space-y-2">
                        {lines.map((line, index) => (
                            <OrderDraftLineRow
                                key={line.key}
                                line={line}
                                error={lineErrors[index]}
                                disabled={busy}
                                onChange={(patch) => updateLine(line.key, patch)}
                                onRemove={() =>
                                    setLines((prev) => prev.filter(({ key }) => key !== line.key))
                                }
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        <ShoppingBasket className="size-6" aria-hidden="true" />
                        <p>{t("noItems")}</p>
                    </div>
                )}
                {linesError && <p className="text-sm text-destructive">{linesError}</p>}

                <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t pt-3">
                    {gifts > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t("giftsValue", { value: money(gifts) })}
                        </p>
                    )}
                    <p className="text-lg font-semibold">
                        {t("total")} <span className="font-mono tabular-nums">{money(total)}</span>
                    </p>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                {canChooseStage && funnels.data && funnels.data.length > 0 && (
                    <OrderStageSelect
                        funnels={funnels.data}
                        value={stageId}
                        onChange={setStageId}
                        disabled={busy}
                    />
                )}
                <Field label={t("notes")}>
                    <textarea
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        rows={3}
                        maxLength={1000}
                        value={notes}
                        disabled={busy}
                        onChange={(event) => setNotes(event.target.value)}
                    />
                </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={busy}>
                    {busy ? t("submitting") : t("submit")}
                </Button>
                <Button variant="ghost" asChild>
                    <Link href={localizedLink(ROUTES.CRM_ORDERS)}>{t("cancel")}</Link>
                </Button>
            </div>
        </form>
    );
}

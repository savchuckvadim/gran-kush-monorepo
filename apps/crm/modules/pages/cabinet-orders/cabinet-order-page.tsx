"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft, Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import { useCancelMyOrder, useMyOrder } from "@/modules/entities/cabinet-order";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { useDateTimeFormat } from "@/modules/shared/lib/use-date-format";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

import { OrderItemsList } from "./order-items-list";
import { OrderStageBadge } from "./order-stage-badge";
import { OrderStageStrip } from "./order-stage-strip";

/** Один заказ участника: путь по стадиям, позиции, суммы и отмена, пока клуб не взял заказ в работу. */
export function CabinetOrderPage({ slug, orderId }: { slug: string; orderId: string }) {
    const t = useTranslations("cabinet.orders");
    const links = useCabinetLinks();
    const money = useMoneyFormat();
    const formatDate = useDateTimeFormat();
    const order = useMyOrder(slug, orderId);
    const cancel = useCancelMyOrder(slug);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const back = (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={links.clubOrders(slug)}>
                <ArrowLeft aria-hidden="true" />
                {t("back")}
            </Link>
        </Button>
    );

    if (order.isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }
    if (order.error || !order.data) {
        return (
            <div className="space-y-3">
                {back}
                <p role="alert" className="text-sm text-destructive">
                    {order.error ? getApiErrorMessage(order.error) : t("notFound")}
                </p>
            </div>
        );
    }

    const data = order.data;
    const closedAt = data.cancelledAt ?? data.completedAt;

    return (
        <div className="max-w-2xl space-y-4">
            {back}
            <Card>
                <div className="space-y-4 px-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">{data.orderNumber}</h2>
                        <OrderStageBadge stage={data.stage} fallback={t("noStage")} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t("orderedAt", { date: formatDate(data.orderedAt) })}
                        {closedAt && ` · ${t("closedAt", { date: formatDate(closedAt) })}`}
                    </p>

                    <OrderStageStrip funnel={data.funnel} stage={data.stage} />

                    <OrderItemsList items={data.items} />

                    <dl className="space-y-1 border-t pt-3 text-sm">
                        {data.discount > 0 && (
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t("discount")}</dt>
                                <dd className="tabular-nums">−{money(data.discount)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-3 text-base font-semibold">
                            <dt>{t("total")}</dt>
                            <dd className="tabular-nums">{money(data.total)}</dd>
                        </div>
                    </dl>

                    {data.notes && (
                        <p className="rounded-md bg-muted px-3 py-2 text-sm">{data.notes}</p>
                    )}

                    {cancel.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {getApiErrorMessage(cancel.error)}
                        </p>
                    )}
                    {data.canCancel && (
                        <Button
                            variant="outline"
                            disabled={cancel.isPending}
                            onClick={() => setConfirmCancel(true)}
                        >
                            {t("cancel")}
                        </Button>
                    )}
                </div>
            </Card>

            <ConfirmDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
                title={t("cancelTitle")}
                description={t("cancelText")}
                confirmLabel={t("cancelConfirm")}
                cancelLabel={t("keep")}
                pending={cancel.isPending}
                tone="destructive"
                onConfirm={() =>
                    cancel.mutate(orderId, { onSettled: () => setConfirmCancel(false) })
                }
            />
        </div>
    );
}

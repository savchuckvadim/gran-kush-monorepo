"use client";

import { useTranslations } from "next-intl";

import { Button, Card } from "@workspace/ui";

import {
    isFailureStage,
    type OrderDetail,
    PAYMENT_METHODS,
    PAYMENT_STATUSES,
    type PaymentMethod,
    type PaymentStatus,
    useUpdatePaymentStatus,
} from "@/modules/entities/order";
import { notifyApiError } from "@/modules/shared";

interface OrderPaymentCardProps {
    order: OrderDetail;
    /** Manager and up, the same rule as the API */
    canEdit: boolean;
}

/** Payment status of the order; a cancelled order's payment is not touched. */
export function OrderPaymentCard({ order, canEdit }: OrderPaymentCardProps) {
    const t = useTranslations("crm.orders.detail");
    const update = useUpdatePaymentStatus();
    const isCancelled = order.stage !== null && isFailureStage(order.stage);
    const locked = !canEdit || isCancelled || update.isPending;

    const setPayment = (paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) =>
        update.mutate(
            { id: order.id, paymentStatus, paymentMethod },
            { onError: (error) => notifyApiError(error, t("paymentStatus")) }
        );

    return (
        <Card className="p-5">
            <h2 className="mb-3 text-base font-medium">{t("paymentStatus")}</h2>
            <div className="flex flex-wrap gap-1">
                {PAYMENT_STATUSES.map((status) => (
                    <Button
                        key={status}
                        variant={order.paymentStatus === status ? "default" : "outline"}
                        size="sm"
                        aria-pressed={order.paymentStatus === status}
                        disabled={locked || order.paymentStatus === status}
                        onClick={() => setPayment(status)}
                    >
                        {t(`payment.${status}`)}
                    </Button>
                ))}
            </div>
            {order.paymentStatus === "paid" ? (
                <div className="mt-3 flex flex-wrap items-center gap-1">
                    <span className="mr-2 text-xs text-muted-foreground">
                        {t("paymentMethod")}:
                    </span>
                    {PAYMENT_METHODS.map((method) => (
                        <Button
                            key={method}
                            variant="outline"
                            size="sm"
                            disabled={locked}
                            onClick={() => setPayment("paid", method)}
                        >
                            {t(`method.${method}`)}
                        </Button>
                    ))}
                </div>
            ) : null}
        </Card>
    );
}

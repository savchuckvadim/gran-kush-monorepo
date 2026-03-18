"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft, Loader2 } from "lucide-react";

import type { SchemaOrderItemDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { type OrderStatus, type PaymentStatus,useOrderDetail, useUpdateOrderStatus, useUpdatePaymentStatus } from "@/modules/entities/order";

interface OrderDetailCardProps {
    orderId: string;
    locale: string;
}

const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "refunded"];
const PAYMENT_METHODS = ["cash", "card", "crypto"] as const;

export function OrderDetailCard({ orderId, locale }: OrderDetailCardProps) {
    const t = useTranslations("crm.orders.detail");
    const { data: order, isLoading, error } = useOrderDetail(orderId);
    const updateStatus = useUpdateOrderStatus();
    const updatePayment = useUpdatePaymentStatus();

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (error || !order) {
        return (
            <Card className="p-6">
                <p className="text-destructive">{t("error")}</p>
            </Card>
        );
    }

    const memberName = order.member
        ? `${order.member.name} ${order.member.surname ?? ""}`.trim()
        : "—";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${locale}/crm/orders`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">
                        {t("orderTitle")} #{order.orderNumber}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {new Date(order.orderedAt).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Основная информация */}
            <Card className="p-6">
                <h2 className="mb-4 text-base font-medium">{t("info")}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow label={t("member")} value={memberName} />
                    <InfoRow label={t("total")} value={`€${order.total}`} />
                    <InfoRow label={t("subtotal")} value={`€${order.subtotal}`} />
                    <InfoRow label={t("discount")} value={`€${order.discount}`} />

                    {order.notes && <InfoRow label={t("notes")} value={order.notes} />}
                    {order.adminNotes && (
                        <InfoRow label={t("adminNotes")} value={order.adminNotes} />
                    )}
                </div>
            </Card>

            {/* Статус заказа */}
            <Card className="p-6">
                <h2 className="mb-4 text-base font-medium">{t("orderStatus")}</h2>
                <div className="flex flex-wrap gap-1">
                    {ORDER_STATUSES.map((s) => (
                        <Button
                            key={s}
                            variant={order.status === s ? "default" : "outline"}
                            size="sm"
                            disabled={
                                updateStatus.isPending ||
                                order.status === s ||
                                order.status === "cancelled"
                            }
                            onClick={() =>
                                updateStatus.mutate({ id: orderId, data: { status: s } })
                            }
                        >
                            {t(`status.${s}`)}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Статус оплаты */}
            <Card className="p-6">
                <h2 className="mb-4 text-base font-medium">{t("paymentStatus")}</h2>
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                        {PAYMENT_STATUSES.map((ps) => (
                            <Button
                                key={ps}
                                variant={order.paymentStatus === ps ? "default" : "outline"}
                                size="sm"
                                disabled={updatePayment.isPending || order.paymentStatus === ps}
                                onClick={() =>
                                    updatePayment.mutate({
                                        id: orderId,
                                        data: { paymentStatus: ps },
                                    })
                                }
                            >
                                {t(`payment.${ps}`)}
                            </Button>
                        ))}
                    </div>

                    {order.paymentStatus === "paid" && (
                        <div className="flex flex-wrap gap-1">
                            <span className="mr-2 text-xs text-muted-foreground">{t("paymentMethod")}:</span>
                            {PAYMENT_METHODS.map((m) => (
                                <Button
                                    key={m}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        updatePayment.mutate({
                                            id: orderId,
                                            data: {
                                                paymentStatus: "paid",
                                                paymentMethod: m,
                                            },
                                        })
                                    }
                                    disabled={updatePayment.isPending}
                                >
                                    {t(`method.${m}`)}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Позиции заказа */}
            <Card className="p-6">
                <h2 className="mb-4 text-base font-medium">{t("items")}</h2>
                {order.items && order.items.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">{t("colProduct")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colQty")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colPrice")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colItemTotal")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item: SchemaOrderItemDto) => (
                                    <tr key={item.id} className="border-b last:border-b-0">
                                        <td className="px-3 py-2">
                                            {item.product?.name ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {item.quantity} {item.product?.measurementUnit?.code ?? ""}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            €{item.unitPrice}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            €{item.totalPrice}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t("noItems")}</p>
                )}
            </Card>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

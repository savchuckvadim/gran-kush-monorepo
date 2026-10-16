"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, LoadMoreTrigger } from "@workspace/ui";

import { useMyOrders } from "@/modules/entities/cabinet-order";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { useDateTimeFormat } from "@/modules/shared/lib/use-date-format";

import { OrderListItem } from "./order-list-item";

/** Заказы участника в клубе, новые сверху; стадии обновляются сами, пока страница открыта. */
export function CabinetOrdersPage({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.orders");
    const links = useCabinetLinks();
    const formatDate = useDateTimeFormat();
    const orders = useMyOrders(slug);

    if (orders.isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }
    if (orders.error) {
        return (
            <p role="alert" className="text-sm text-destructive">
                {getApiErrorMessage(orders.error)}
            </p>
        );
    }

    const items = orders.data?.pages.flatMap((page) => page.items) ?? [];

    if (items.length === 0) {
        return (
            <Card>
                <div className="space-y-3 px-4">
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                    <Button asChild size="sm" variant="outline">
                        <Link href={links.clubShop(slug)}>{t("toShop")}</Link>
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <Card padding="sm" className="p-0">
                <ul className="divide-y">
                    {items.map((order) => (
                        <OrderListItem
                            key={order.id}
                            order={order}
                            href={links.clubOrder(slug, order.id)}
                            formatDate={formatDate}
                        />
                    ))}
                </ul>
            </Card>
            <LoadMoreTrigger
                hasMore={orders.hasNextPage}
                loading={orders.isFetchingNextPage}
                onLoadMore={() => void orders.fetchNextPage()}
                label={t("loadMore")}
            />
        </div>
    );
}

"use client";

import { CreateOrderForm } from "@/modules/features/order-create";
import {
    type EntityRef,
    newOrderPrefill,
    sliderStore,
    useEntityHref,
} from "@/modules/shared/lib/entity-slider";

/** Новый заказ в слайдере: созданный заказ встаёт на место черновика, «Отмена» закрывает панель. */
export function NewOrderPanel({ id }: { id: string }) {
    const hrefOf = useEntityHref();
    const prefill = newOrderPrefill(id);

    return (
        <CreateOrderForm
            initialMemberId={prefill.memberId}
            initialProductId={prefill.productId}
            onCreated={(order) => {
                const created: EntityRef = { kind: "order", id: order.id };
                sliderStore.replaceTop(created, hrefOf(created));
            }}
            onCancel={() => sliderStore.close()}
        />
    );
}

"use client";

import type { SliderEntry } from "@/modules/shared/lib/entity-slider";
import { MemberCard } from "@/modules/widgets/member/card";
import { OrderDetail } from "@/modules/widgets/orders/order-detail";

/** What each kind of entity shows in a slider: the same card as on its page. */
export function EntityPanelContent({ entry }: { entry: SliderEntry }) {
    switch (entry.kind) {
        case "member":
            return <MemberCard memberId={entry.id} layout="slider" />;
        case "order":
            return <OrderDetail orderId={entry.id} layout="slider" />;
    }
}

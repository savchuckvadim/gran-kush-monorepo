"use client";

import type { SliderEntry } from "@/modules/shared/lib/entity-slider";
import { EmployeeCard } from "@/modules/widgets/employee/card";
import { MemberCard } from "@/modules/widgets/member/card";
import { OrderDetail } from "@/modules/widgets/orders/order-detail";
import { ProductDetailCard } from "@/modules/widgets/products/product-detail";

import { NewOrderPanel } from "./NewOrderPanel";

/** What each kind of entity shows in a slider: the same card as on its page. */
export function EntityPanelContent({ entry }: { entry: SliderEntry }) {
    switch (entry.kind) {
        case "member":
            return <MemberCard memberId={entry.id} layout="slider" />;
        case "order":
            return <OrderDetail orderId={entry.id} layout="slider" />;
        case "employee":
            return <EmployeeCard employeeId={entry.id} layout="slider" />;
        case "product":
            return <ProductDetailCard productId={entry.id} layout="slider" />;
        case "newOrder":
            return <NewOrderPanel id={entry.id} />;
    }
}

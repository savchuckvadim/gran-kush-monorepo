"use client";

import { usePermissions } from "@/modules/entities/access";
import { pickFunnel, useOrderFunnels } from "@/modules/entities/order";
import {
    OrdersKanban,
    OrdersList,
    OrdersPageHeader,
    useOrderFilters,
    useOrdersView,
} from "@/modules/widgets/orders";

/** Orders: a list (closed ones included) or a kanban by stage, one filter for both. */
export function OrdersPage() {
    const { view, setView, funnelId, setFunnelId } = useOrdersView();
    const { data: funnels = [] } = useOrderFunnels();
    const funnel = pickFunnel(funnels, funnelId);
    const { can } = usePermissions();
    const canProcess = can("orders.process");
    const filters = useOrderFilters(funnel?.stages ?? [], { withStage: view === "list" });

    return (
        <div className="space-y-4">
            <OrdersPageHeader
                view={view}
                onViewChange={setView}
                funnels={funnels}
                funnel={funnel}
                onFunnelChange={setFunnelId}
            />
            {view === "kanban" && funnel ? (
                <OrdersKanban funnel={funnel} filters={filters} canMove={canProcess} />
            ) : (
                <OrdersList filters={filters} />
            )}
        </div>
    );
}

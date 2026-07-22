"use client";

import { useQuery } from "@tanstack/react-query";

import { $api } from "@/modules/shared/api";

type Spending = {
    byPortal: {
        portalId: string;
        slug: string;
        displayName: string;
        ordersCount: number;
        totalSpent: string;
    }[];
    totalSpent: string;
    totalOrders: number;
};

export default function SpendingPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["my-spending"],
        queryFn: async () => {
            const res = await $api.GET("/lk/spending");
            return res.data as Spending | undefined;
        },
    });

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-6 text-2xl font-bold">Мои траты</h1>

            {isLoading ? <p className="text-muted-foreground">Загрузка…</p> : null}

            {data ? (
                <>
                    <div className="mb-6 rounded-xl border p-4">
                        <p className="text-sm text-muted-foreground">Всего по всем клубам</p>
                        <p className="text-2xl font-bold">{data.totalSpent} €</p>
                        <p className="text-xs text-muted-foreground">
                            {data.totalOrders} заказов
                        </p>
                    </div>

                    <div className="space-y-3">
                        {data.byPortal.map((portal) => (
                            <div
                                key={portal.portalId}
                                className="flex items-center justify-between rounded-xl border p-4"
                            >
                                <div>
                                    <h2 className="font-semibold">{portal.displayName}</h2>
                                    <p className="text-xs text-muted-foreground">
                                        {portal.ordersCount} заказов
                                    </p>
                                </div>
                                <p className="font-semibold">{portal.totalSpent} €</p>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

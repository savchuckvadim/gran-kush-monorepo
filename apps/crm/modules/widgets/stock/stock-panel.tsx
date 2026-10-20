"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PackageMinus, PackagePlus } from "lucide-react";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { PurchaseDialog, StockMoveDialog } from "@/modules/features/stock-moves";

import { MarginTable } from "./margin-table";
import { PurchasesTable } from "./purchases-table";
import { StockMovesTable } from "./stock-moves-table";

const SECTIONS = ["purchases", "moves", "margin"] as const;
type Section = (typeof SECTIONS)[number];

interface StockPanelProps {
    range: { from: string; to: string };
    onOpenEntry: (entryId: string) => void;
}

/** Вкладка «Склад» в финансах: поставки, журнал движений, маржа; кнопки поставки и списания. */
export function StockPanel({ range, onOpenEntry }: StockPanelProps) {
    const t = useTranslations("crm.stock");
    const { can } = usePermissions();
    const [section, setSection] = useState<Section>("purchases");
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);

    return (
        <div className="space-y-4">
            {can("catalog.manage") && (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPurchaseOpen(true)}>
                        <PackagePlus aria-hidden="true" />
                        {t("actions.purchase")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
                        <PackageMinus aria-hidden="true" />
                        {t("actions.move")}
                    </Button>
                </div>
            )}
            <Tabs
                value={section}
                onValueChange={(value) =>
                    setSection(SECTIONS.find((item) => item === value) ?? "purchases")
                }
            >
                <TabsList>
                    {SECTIONS.map((item) => (
                        <TabsTrigger key={item} value={item}>
                            {t(`sections.${item}`)}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="purchases">
                    <PurchasesTable range={range} onOpenEntry={onOpenEntry} />
                </TabsContent>
                <TabsContent value="moves">
                    <StockMovesTable />
                </TabsContent>
                <TabsContent value="margin">
                    <MarginTable range={range} />
                </TabsContent>
            </Tabs>
            <PurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} />
            <StockMoveDialog open={moveOpen} onOpenChange={setMoveOpen} />
        </div>
    );
}

"use client";

import { useState } from "react";

import { FieldsTab } from "./fields-tab";
import { FormsTab } from "./forms-tab";
import { StagesTab } from "./stages-tab";

const TABS = [
    { id: "fields", label: "Поля" },
    { id: "forms", label: "Формы" },
    { id: "stages", label: "Стадии" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EntitySettingsPage({ code }: { code: string }) {
    const [tab, setTab] = useState<TabId>("fields");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Настройка сущности: {code}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Поля, формы по назначению и стадии воронок.
                </p>
            </div>

            <div className="flex gap-2 border-b">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                            tab === item.id
                                ? "border-primary font-medium text-foreground"
                                : "border-transparent text-muted-foreground"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "fields" ? <FieldsTab code={code} /> : null}
            {tab === "forms" ? <FormsTab code={code} /> : null}
            {tab === "stages" ? <StagesTab code={code} /> : null}
        </div>
    );
}

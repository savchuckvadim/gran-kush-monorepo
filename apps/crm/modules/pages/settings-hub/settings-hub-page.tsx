"use client";

import { type KeyboardEvent, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Boxes, CreditCard, Package, Palette, UserRound, Users } from "lucide-react";

import { TooltipProvider } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { type Permission, usePermissions } from "@/modules/entities/access";

import {
    AppearancePanel,
    BillingPanel,
    CatalogPanel,
    EntitiesPanel,
    MembersPanel,
    TeamPanel,
} from "./panels";

/** Вкладка видна, если у роли есть хотя бы одно из прав `anyOf`; `null` — у всех. */
const TABS = [
    {
        id: "members",
        icon: UserRound,
        Panel: MembersPanel,
        anyOf: ["settings.structure", "members.invite", "settings.club", "members.create"],
    },
    {
        id: "team",
        icon: Users,
        Panel: TeamPanel,
        anyOf: ["employees.read", "employees.manage", "roles.manage"],
    },
    { id: "catalog", icon: Package, Panel: CatalogPanel, anyOf: ["catalog.manage"] },
    { id: "entities", icon: Boxes, Panel: EntitiesPanel, anyOf: ["settings.structure"] },
    { id: "billing", icon: CreditCard, Panel: BillingPanel, anyOf: ["billing.manage"] },
    { id: "appearance", icon: Palette, Panel: AppearancePanel, anyOf: null },
] as const satisfies readonly ({ anyOf: readonly Permission[] | null } & Record<string, unknown>)[];

type Tab = (typeof TABS)[number];
type TabId = Tab["id"];

/**
 * Настройки по категориям: вкладки справа (на телефоне — лентой сверху), слева — плитки
 * подразделов с короткой сводкой. Вкладка хранится в ?tab=, чтобы на неё можно было дать ссылку.
 */
export function SettingsHubPage() {
    const t = useTranslations("crm.settingsHub");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { can } = usePermissions();
    const tabs: readonly Tab[] = TABS.filter(
        (tab) => tab.anyOf === null || tab.anyOf.some((code) => can(code))
    );
    const requested = searchParams.get("tab");
    const current: TabId =
        tabs.find((tab) => tab.id === requested)?.id ?? tabs[0]?.id ?? "appearance";
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const select = (id: TabId) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const index = tabs.findIndex((tab) => tab.id === current);
        const next = tabs[(index + step + tabs.length) % tabs.length]?.id ?? current;
        select(next);
        tabRefs.current[next]?.focus();
    };

    const active = tabs.find((tab) => tab.id === current) ?? tabs[0];

    return (
        <TooltipProvider delayDuration={250}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
                    <div
                        role="tablist"
                        aria-label={t("title")}
                        aria-orientation="vertical"
                        onKeyDown={onKeyDown}
                        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:sticky lg:top-20 lg:order-last lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0"
                    >
                        {tabs.map(({ id, icon: Icon }) => {
                            const selected = id === current;
                            return (
                                <button
                                    key={id}
                                    ref={(node) => {
                                        tabRefs.current[id] = node;
                                    }}
                                    type="button"
                                    role="tab"
                                    id={`settings-tab-${id}`}
                                    aria-selected={selected}
                                    aria-controls="settings-panel"
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => select(id)}
                                    className={cn(
                                        "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full",
                                        selected
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold whitespace-nowrap">
                                            {t(`tabs.${id}.title`)}
                                        </span>
                                        <span className="text-muted-foreground hidden text-xs lg:block">
                                            {t(`tabs.${id}.description`)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <section
                        id="settings-panel"
                        role="tabpanel"
                        aria-labelledby={`settings-tab-${current}`}
                        className="min-w-0 space-y-4"
                    >
                        <div>
                            <h2 className="text-lg font-semibold">{t(`tabs.${current}.title`)}</h2>
                            <p className="text-muted-foreground text-sm">
                                {t(`tabs.${current}.description`)}
                            </p>
                        </div>
                        {active && <active.Panel />}
                    </section>
                </div>
            </div>
        </TooltipProvider>
    );
}

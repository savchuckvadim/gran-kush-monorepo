"use client";

import * as React from "react";
import Link from "next/link";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useSidebar } from "./sidebar-context";

export interface ISidebarItem {
    id: number;
    code: string;
    url: string;
    title: string;
    isActive: boolean;
    icon: React.ReactNode;
}

export interface ISidebarProps {
    /** Знак и название; подпись с `data-slot="brand-name"` прячется в узком сайдбаре. */
    brand: React.ReactNode;
    items: ISidebarItem[];
    /** Пункты внизу сайдбара (сканер QR и т.п.). */
    footerItems?: ISidebarItem[];
    homeHref: string;
}

function SidebarLink({
    item,
    showText,
    onNavigate,
}: {
    item: ISidebarItem;
    showText: boolean;
    onNavigate: () => void;
}) {
    return (
        <Link
            // `href` уже полный путь с locale и portal — его собирает родитель (useCrmNavigation)
            href={item.url}
            title={item.title}
            onClick={onNavigate}
            data-slot="sidebar-link"
            data-active={item.isActive || undefined}
            aria-current={item.isActive ? "page" : undefined}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "md:justify-center md:px-2",
                showText ? "lg:justify-start lg:px-3" : "lg:justify-center lg:px-2",
                item.isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
        >
            <span className="shrink-0 [&_svg]:size-[1.125rem]">{item.icon}</span>
            <span className={cn("truncate md:hidden", showText ? "lg:block" : "lg:hidden")}>
                {item.title}
            </span>
        </Link>
    );
}

export function Sidebar({ brand, items, footerItems = [], homeHref }: ISidebarProps) {
    const { isOpen, close } = useSidebar();
    const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);

    const showText = !isDesktopCollapsed;

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/50 md:hidden"
                    onClick={close}
                    aria-hidden="true"
                />
            )}

            {/* On phones the drawer opens under the 4rem header, so the burger stays on top as a cross */}
            <aside
                data-slot="sidebar"
                data-collapsed={isDesktopCollapsed || undefined}
                className={cn(
                    "fixed left-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-64 flex-col bg-card transition-all duration-300 ease-in-out",
                    "md:sticky md:top-0 md:z-auto md:h-dvh md:w-16 md:self-start lg:w-56",
                    isDesktopCollapsed ? "lg:w-16" : "lg:w-56",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div
                    className={cn(
                        "flex h-16 shrink-0 items-center gap-2 px-4 md:justify-center md:px-0",
                        showText ? "lg:justify-between lg:px-4" : "lg:justify-center lg:px-0"
                    )}
                >
                    <Link
                        href={homeHref}
                        onClick={close}
                        className={cn(
                            "flex min-w-0 items-center",
                            "md:[&_[data-slot=brand-name]]:hidden",
                            showText
                                ? "lg:[&_[data-slot=brand-name]]:block"
                                : "lg:[&_[data-slot=brand-name]]:hidden"
                        )}
                    >
                        {brand}
                    </Link>

                    {showText && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Свернуть меню"
                            className="hidden shrink-0 text-muted-foreground lg:inline-flex"
                            onClick={() => setIsDesktopCollapsed(true)}
                        >
                            <ChevronLeft />
                        </Button>
                    )}
                </div>

                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:px-3">
                    {items.map((item) => (
                        // `id` может повторяться — key по комбинации
                        <SidebarLink
                            key={`${item.id}-${item.url}`}
                            item={item}
                            showText={showText}
                            onNavigate={close}
                        />
                    ))}
                </nav>

                <div className="shrink-0 space-y-1 p-2 lg:px-3">
                    {footerItems.map((item) => (
                        <SidebarLink
                            key={`${item.id}-${item.url}`}
                            item={item}
                            showText={showText}
                            onNavigate={close}
                        />
                    ))}
                    {!showText && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Развернуть меню"
                            className="hidden w-full text-muted-foreground lg:inline-flex"
                            onClick={() => setIsDesktopCollapsed(false)}
                        >
                            <ChevronRight />
                        </Button>
                    )}
                </div>
            </aside>
        </>
    );
}

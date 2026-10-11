"use client";

import * as React from "react";
import Link from "next/link";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { BrandMark } from "../Brand";

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
    title: string;
    items: ISidebarItem[];
    homeHref: string;
    footer?: React.ReactNode;
    /** Shown only in the mobile drawer: the header controls that do not fit a phone header. */
    mobilePanel?: React.ReactNode;
}

export function Sidebar({ title, items, homeHref, footer, mobilePanel }: ISidebarProps) {
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
                className={cn(
                    "fixed left-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-64 flex-col bg-card transition-all duration-300 ease-in-out",
                    "md:relative md:top-0 md:z-auto md:h-auto md:min-h-screen md:w-16 lg:w-56",
                    isDesktopCollapsed ? "lg:w-16" : "lg:w-56",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="hidden h-16 items-center justify-center py-8 md:flex lg:justify-between lg:px-6">
                    <Link href={homeHref} className="flex items-center gap-2" onClick={close}>
                        <BrandMark />
                        <span
                            className={cn(
                                "text-lg font-bold md:hidden",
                                showText ? "lg:block" : "lg:hidden"
                            )}
                        >
                            {title}
                        </span>
                    </Link>

                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={showText ? "Свернуть sidebar" : "Развернуть sidebar"}
                        className="hidden ml-2 h-2 w-2 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
                        onClick={() => setIsDesktopCollapsed((v) => !v)}
                    >
                        {showText ? (
                            <ChevronLeft className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:p-4">
                    {items.map((item) => (
                        <Link
                            // `id` может повторяться — делаем key уникальным по комбинации.
                            // `href` уже полный путь с locale и portal — родитель (например useCrmNavigation) обязан передать итоговый URL; useLocalizedLink внутри Sidebar не вызываем, чтобы не дублировать префиксы.
                            key={`${item.id}-${item.url}`}
                            href={item.url}
                            title={item.title}
                            onClick={close}
                            data-slot="sidebar-link"
                            data-active={item.isActive || undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                "md:justify-center md:px-2",
                                showText ? "lg:justify-start lg:px-3" : "lg:justify-center lg:px-2",
                                item.isActive
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            <span className={cn("md:hidden", showText ? "lg:block" : "lg:hidden")}>
                                {item.title}
                            </span>
                            {item.isActive && (
                                <ChevronRight
                                    className={cn(
                                        "ml-auto h-4 w-4 md:hidden",
                                        showText ? "lg:block" : "lg:hidden"
                                    )}
                                />
                            )}
                        </Link>
                    ))}
                </nav>

                {mobilePanel && <div className="shrink-0 px-2 pb-2 md:hidden">{mobilePanel}</div>}

                {footer && <div className="mb-2 w-full shrink-0 px-2">{footer}</div>}
            </aside>
        </>
    );
}

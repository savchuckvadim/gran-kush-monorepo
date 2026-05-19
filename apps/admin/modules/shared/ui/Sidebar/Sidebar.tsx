"use client";

import * as React from "react";
import Link from "next/link";

import { Cannabis, ChevronLeft, ChevronRight } from "lucide-react";

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
    title: string;
    items: ISidebarItem[];
    homeHref: string;
    footer?: React.ReactNode;
}

export function Sidebar({ title, items, homeHref, footer }: ISidebarProps) {
    const { isOpen, close } = useSidebar();
    const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);

    const showText = !isDesktopCollapsed;

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={close}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 flex h-dvh w-56 flex-col bg-card transition-all duration-300 ease-in-out",
                    "md:relative md:z-auto md:h-auto md:min-h-screen md:w-16 lg:w-56",
                    isDesktopCollapsed ? "lg:w-16" : "lg:w-56",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex justify-between h-16 items-center px-6 py-8 md:justify-center md:px-0 lg:justify-between lg:px-6">
                    <Link href={homeHref} className="flex items-center gap-2" onClick={close}>
                        <Cannabis className="h-6 w-6 shrink-0 text-primary" />
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

                {footer && <div className="mb-2 w-full shrink-0 px-2">{footer}</div>}
            </aside>
        </>
    );
}

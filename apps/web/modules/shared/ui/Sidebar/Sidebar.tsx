"use client";

import * as React from "react";
import Link from "next/link";

import { Cat, ChevronRight } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { useSidebar } from "./sidebar-context";
import { LogoutButton } from "../LogoutButton/logout-button";

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
}
export function Sidebar({ title, items }: ISidebarProps) {
    const { isOpen, close } = useSidebar();

    return (
        <>
            {/* Затемнение фона — только на мобильных при открытом меню */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={close}
                    aria-hidden="true"
                />
            )}

            {/* Сайдбар */}
            <aside
                className={cn(
                    "flex flex-col bg-card transition-all duration-300 ease-in-out",
                    // fixed на мобильных, relative на md+
                    "fixed top-0 left-0 z-40 h-dvh",
                    "md:relative md:z-auto md:h-auto md:min-h-screen",
                    // Мобильные: выезжает/прячется по isOpen
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    // Ширина: md — только иконки, lg — полный
                    "w-56 md:w-16 lg:w-56"
                )}
            >
                {/* Логотип / заголовок */}
                <div className="flex h-16 items-center px-6 py-8 md:justify-center lg:justify-start md:px-0 lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2" onClick={close}>
                        <Cat className="h-6 w-6 text-primary flex-shrink-0" />
                        <span className="text-lg font-bold md:hidden lg:block">{title}</span>
                    </Link>
                </div>

                {/* Навигация */}
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:p-4">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.url}
                            title={item.title}
                            onClick={close}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                "md:justify-center md:px-2 lg:justify-start lg:px-3",
                                item.isActive
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="md:hidden lg:block">{item.title}</span>
                            {item.isActive && (
                                <ChevronRight className="ml-auto h-4 w-4 md:hidden lg:block" />
                            )}
                        </Link>
                    ))}
                </nav>
                <div className="mb-2 w-full shrink-0 px-2">
                    <LogoutButton variant="outline" />
                </div>
            </aside>
        </>
    );
}

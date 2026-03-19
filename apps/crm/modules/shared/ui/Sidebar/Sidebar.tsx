"use client";

import Link from "next/link";

import { Cat, ChevronRight } from "lucide-react";

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

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={close} aria-hidden="true" />}

            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 flex h-dvh w-56 flex-col bg-card transition-all duration-300 ease-in-out",
                    "md:relative md:z-auto md:h-auto md:min-h-screen md:w-16 lg:w-56",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                )}
            >
                <div className="flex h-16 items-center px-6 py-8 md:justify-center md:px-0 lg:justify-start lg:px-6">
                    <Link href={homeHref} className="flex items-center gap-2" onClick={close}>
                        <Cat className="h-6 w-6 shrink-0 text-primary" />
                        <span className="text-lg font-bold md:hidden lg:block">{title}</span>
                    </Link>
                </div>

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
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="md:hidden lg:block">{item.title}</span>
                            {item.isActive && <ChevronRight className="ml-auto h-4 w-4 md:hidden lg:block" />}
                        </Link>
                    ))}
                </nav>

                {footer && <div className="mb-2 w-full shrink-0 px-2">{footer}</div>}
            </aside>
        </>
    );
}

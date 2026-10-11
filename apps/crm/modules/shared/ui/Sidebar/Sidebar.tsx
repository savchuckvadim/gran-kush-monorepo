"use client";

import * as React from "react";
import Link from "next/link";

import { PanelLeftClose, Pin } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useSidebar } from "./sidebar-context";
import { useSidebarPinned } from "./use-sidebar-pinned";

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
    /** Пункты внизу сайдбара (настройки и т.п.). */
    footerItems?: ISidebarItem[];
    homeHref: string;
    /** Подписи кнопок закрепления (по умолчанию — русские). */
    labels?: { collapse: string; pin: string };
}

const PEEK_OPEN_DELAY = 180;
const PEEK_CLOSE_DELAY = 320;

const isEditable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Labels are shown by breakpoint classes, so the server and the browser render the same layout:
 * phones — always (drawer); tablets — only while peeking; desktop — when pinned or peeking.
 */
const labelClass = (peek: boolean, pinned: boolean) =>
    peek ? "md:block" : pinned ? "md:hidden lg:block" : "md:hidden";

function SidebarLink({
    item,
    peek,
    pinned,
    onNavigate,
}: {
    item: ISidebarItem;
    peek: boolean;
    pinned: boolean;
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
                peek
                    ? "md:justify-start md:px-3"
                    : pinned
                      ? "md:justify-center md:px-2 lg:justify-start lg:px-3"
                      : "md:justify-center md:px-2",
                item.isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
        >
            <span className="shrink-0 [&_svg]:size-[1.125rem]">{item.icon}</span>
            <span className={cn("truncate", labelClass(peek, pinned))}>{item.title}</span>
        </Link>
    );
}

/**
 * Collapsed, the sidebar is a rail of icons; hovering it slides the full menu over the content
 * (the page does not move) and leaving folds it back. The pin next to the logo keeps it open;
 * Ctrl/⌘ B does the same from the keyboard.
 */
export function Sidebar({ brand, items, footerItems = [], homeHref, labels }: ISidebarProps) {
    const { isOpen, close } = useSidebar();
    const [pinned, setPinned] = useSidebarPinned();
    const [peek, setPeek] = React.useState(false);
    const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const text = labels ?? { collapse: "Свернуть меню", pin: "Закрепить меню" };

    // A rail exists on tablets always and on desktops when the menu is not pinned
    const isRail = () =>
        window.matchMedia("(min-width: 768px)").matches &&
        !(pinned && window.matchMedia("(min-width: 1024px)").matches);

    const schedule = (open: boolean) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setPeek(open), open ? PEEK_OPEN_DELAY : PEEK_CLOSE_DELAY);
    };

    React.useEffect(() => () => clearTimeout(timer.current), []);

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") return;
            if (isEditable(event.target)) return;
            event.preventDefault();
            setPeek(false);
            setPinned(!pinned);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [pinned, setPinned]);

    const navigate = () => {
        clearTimeout(timer.current);
        setPeek(false);
        close();
    };

    const footer = footerItems.map((item) => (
        <SidebarLink
            key={`${item.id}-${item.url}`}
            item={item}
            peek={peek}
            pinned={pinned}
            onNavigate={navigate}
        />
    ));

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
                data-collapsed={(!pinned && !peek) || undefined}
                data-peek={peek || undefined}
                className={cn(
                    "group/sidebar fixed left-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-64 flex-col bg-card transition-[width,translate] duration-300 ease-in-out",
                    // above the sticky header (z-30): the peeking panel covers its left end
                    "md:sticky md:top-0 md:z-40 md:h-dvh md:w-16 md:self-start",
                    pinned && "lg:w-56",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div
                    data-slot="sidebar-panel"
                    data-peek={peek || undefined}
                    onMouseEnter={() => isRail() && schedule(true)}
                    onMouseLeave={() => schedule(false)}
                    onFocus={() => isRail() && setPeek(true)}
                    onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setPeek(false);
                    }}
                    className={cn(
                        "flex h-full w-full flex-col transition-[width,box-shadow] duration-200 ease-out",
                        peek && "md:absolute md:inset-y-0 md:left-0 md:w-56 md:shadow-2xl"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-16 shrink-0 items-center gap-2 px-4",
                            peek
                                ? "md:justify-between md:px-4"
                                : pinned
                                  ? "md:justify-center md:px-0 lg:justify-between lg:px-4"
                                  : "md:justify-center md:px-0"
                        )}
                    >
                        <Link
                            href={homeHref}
                            onClick={navigate}
                            className={cn(
                                "flex min-w-0 items-center",
                                peek
                                    ? "md:[&_[data-slot=brand-name]]:block"
                                    : pinned
                                      ? "md:[&_[data-slot=brand-name]]:hidden lg:[&_[data-slot=brand-name]]:block"
                                      : "md:[&_[data-slot=brand-name]]:hidden"
                            )}
                        >
                            {brand}
                        </Link>

                        {(pinned || peek) && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={pinned ? text.collapse : text.pin}
                                title={`${pinned ? text.collapse : text.pin} · Ctrl B`}
                                onClick={() => {
                                    setPeek(false);
                                    setPinned(!pinned);
                                }}
                                className={cn(
                                    "text-muted-foreground hidden shrink-0 opacity-0 transition-opacity group-hover/sidebar:opacity-100 focus-visible:opacity-100 lg:inline-flex",
                                    peek && "opacity-100"
                                )}
                            >
                                {pinned ? <PanelLeftClose /> : <Pin />}
                            </Button>
                        )}
                    </div>

                    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:px-3">
                        {items.map((item) => (
                            // `id` может повторяться — key по комбинации
                            <SidebarLink
                                key={`${item.id}-${item.url}`}
                                item={item}
                                peek={peek}
                                pinned={pinned}
                                onNavigate={navigate}
                            />
                        ))}
                    </nav>

                    <div className="shrink-0 space-y-1 p-2 lg:px-3">{footer}</div>
                </div>
            </aside>
        </>
    );
}

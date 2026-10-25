"use client";

import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { SITE_NAME } from "@/modules/shared/config/site";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";
import { Logo } from "@/modules/shared/ui/logo";
import { useActiveSection } from "@/modules/shared/ui/use-active-section";

import { MobileMenu } from "./mobile-menu";

type BarItem = "services" | "cases" | "insights";

const ITEMS: readonly { id: BarItem; href: string }[] = [
    { id: "services", href: "/#services" },
    { id: "cases", href: "/#cases" },
    { id: "insights", href: INSIGHTS_PATH },
];

/** Home sections that light their item while they cross the reading line. */
const SPIED = ["services", "cases"] as const;

/** Which item an inner page belongs to; the home page is decided by scrolling. */
const itemOfPath = (pathname: string): BarItem | null => {
    if (pathname.startsWith("/insights")) return "insights";
    if (pathname.startsWith("/services")) return "services";
    return null;
};

/**
 * The navigation of phones and tablets, after the PafPaf site: a glass capsule pinned to the
 * bottom of the screen with the mark, three sections and the burger. A pill slides under the
 * current section.
 */
export const MobileBar = () => {
    const t = useTranslations("nav");
    const pathname = usePathname();
    const spied = useActiveSection(SPIED, pathname === "/");
    const active = itemOfPath(pathname) ?? spied;
    const trackRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const track = trackRef.current;
        const pill = pillRef.current;
        if (!track || !pill) return;
        const place = () => {
            const link = active ? track.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
            if (!link) {
                pill.style.opacity = "0";
                return;
            }
            // the first placement jumps to the item; sliding in from the edge would leave its
            // light label on the glass for half a second
            const first = !pill.style.width;
            if (first) pill.style.transitionProperty = "opacity";
            pill.style.left = `${link.offsetLeft}px`;
            pill.style.width = `${link.offsetWidth}px`;
            pill.style.opacity = "1";
            if (first) {
                void pill.offsetWidth;
                pill.style.transitionProperty = "";
            }
            track.dataset.ready = "";
        };
        place();
        const observer = new ResizeObserver(place);
        observer.observe(track);
        return () => observer.disconnect();
    }, [active]);

    return (
        <nav
            aria-label={SITE_NAME}
            className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-1 rounded-full p-1.5 lg:hidden"
        >
            <Link href="/" aria-label={SITE_NAME} className="shrink-0 px-2.5">
                <Logo compact />
            </Link>
            <div ref={trackRef} className="bar-track relative min-w-0 flex-1">
                <span
                    ref={pillRef}
                    aria-hidden
                    className="bar-pill absolute inset-y-0 left-0 w-0 rounded-full bg-primary opacity-0"
                />
                <ul className="flex items-center justify-around">
                    {ITEMS.map((item) => (
                        <li key={item.id}>
                            <Link
                                href={item.href}
                                data-id={item.id}
                                aria-current={active === item.id ? "true" : undefined}
                                className={[
                                    "relative block rounded-full px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 min-[400px]:px-3.5",
                                    active === item.id
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                            >
                                {t(item.id)}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            <MobileMenu />
        </nav>
    );
};

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import NextLink from "next/link";

import { BRAND } from "@/modules/shared/config/site";

import { LogoMark } from "./svg-defs";
import { LangToggle, ModeSwitch } from "./switches";

export interface NavItem {
    id: string;
    label: string;
    href: string;
    // id of a section on the home page that lights this item while it is on screen
    spy?: string;
}

interface NavProps {
    items: NavItem[];
    homeHref: string;
    activeId: string;
    crm: { label: string; href: string };
    labels: { language: string; mode: string };
}

const WAVE = "M0 6 Q 7.5 0 15 6 T 30 6 T 45 6 T 60 6 T 75 6 T 90 6 T 105 6 T 120 6 V12 H0 Z";

export const Nav = ({ items, homeHref, activeId, crm, labels }: NavProps) => {
    const linksRef = useRef<HTMLDivElement>(null);
    const blobRef = useRef<HTMLSpanElement>(null);
    const dropRef = useRef<HTMLSpanElement>(null);
    const [active, setActive] = useState(activeId);
    const [small, setSmall] = useState(false);

    const place = useCallback((id: string) => {
        const box = linksRef.current;
        const link = box?.querySelector<HTMLAnchorElement>(`[data-id="${id}"]`);
        if (!box || !blobRef.current || !dropRef.current) return;
        // A page outside the menu (404) lights no item, and the drop hides with it.
        dropRef.current.style.opacity = link ? "" : "0";
        if (!link) {
            blobRef.current.style.width = "0px";
            box.querySelectorAll("[data-id]").forEach((el) => el.classList.remove("is-on"));
            return;
        }
        const b = box.getBoundingClientRect();
        const r = link.getBoundingClientRect();
        blobRef.current.style.left = `${r.left - b.left}px`;
        blobRef.current.style.width = `${r.width}px`;
        dropRef.current.style.left = `${r.left - b.left + r.width / 2 - 8}px`;
        box.querySelectorAll("[data-id]").forEach((el) =>
            el.classList.toggle("is-on", el === link)
        );
    }, []);

    useLayoutEffect(() => {
        place(active);
    }, [active, place]);

    useEffect(() => {
        const spied = items.filter((item) => item.spy);
        const onScroll = () => {
            setSmall(window.scrollY > 80);
            const sections = spied
                .map((item) => ({ item, el: document.getElementById(item.spy ?? "") }))
                .filter((entry): entry is { item: NavItem; el: HTMLElement } => entry.el !== null);
            if (!sections.length) return;
            const line = window.innerHeight * 0.4;
            let current = sections[0]?.item.id ?? activeId;
            for (const { item, el } of sections)
                if (el.getBoundingClientRect().top <= line) current = item.id;
            setActive(current);
        };
        const onResize = () => place(active);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        void document.fonts?.ready.then(onResize);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
        };
    }, [items, activeId, active, place]);

    return (
        <nav className={`nav glass${small ? " is-small" : ""}`} aria-label={BRAND.name}>
            <NextLink className="logo" href={homeHref} aria-label={BRAND.name}>
                <LogoMark />
                <span>{BRAND.wordmark}</span>
            </NextLink>
            <div className="nav__links" ref={linksRef} onPointerLeave={() => place(active)}>
                <div className="nav__goo" aria-hidden="true">
                    <span className="nav__blob" ref={blobRef} />
                    <span className="nav__drop" ref={dropRef} />
                </div>
                {items.map((item) => (
                    <NextLink
                        key={item.id}
                        href={item.href}
                        data-id={item.id}
                        onPointerEnter={() => place(item.id)}
                        aria-current={active === item.id ? "page" : undefined}
                    >
                        {item.label}
                    </NextLink>
                ))}
            </div>
            <div className="nav__side">
                <LangToggle label={labels.language} />
                <ModeSwitch label={labels.mode} />
                <a className="lbtn lbtn--sm glass chipbtn--crm" href={crm.href}>
                    <span className="lbtn__liq">
                        <svg viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
                            <path d={WAVE} />
                        </svg>
                    </span>
                    <span>{crm.label}</span>
                </a>
            </div>
        </nav>
    );
};

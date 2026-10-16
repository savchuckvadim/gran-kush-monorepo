"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { BURST_EVENT, type BurstDetail } from "../ui/mode";

const VIDEO_SRC = "/media/hero-smoke.mp4";
const POSTER_SRC = "/media/hero-smoke.jpg";
const VIDEO_MEDIA = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";

// Phones and reduced motion keep the poster: the 7 MB smoke video loads only on wide screens.
export const HeroVideo = () => {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const query = window.matchMedia(VIDEO_MEDIA);
        const sync = () => {
            if (query.matches) {
                if (!video.getAttribute("src")) video.src = VIDEO_SRC;
                void video.play().catch(() => undefined);
            } else {
                video.pause();
            }
        };
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    return (
        <video
            ref={ref}
            className="hero__video"
            muted
            loop
            playsInline
            preload="none"
            poster={POSTER_SRC}
            aria-hidden="true"
        />
    );
};

// A glass lens follows the pointer over the hero; a click splashes the smoke.
export const HeroLens = () => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const lens = ref.current;
        const hero = lens?.closest<HTMLElement>(".hero");
        if (!lens || !hero) return;
        const enter = () => hero.classList.add("is-hover");
        const leave = () => hero.classList.remove("is-hover");
        const move = (event: PointerEvent) => {
            const r = hero.getBoundingClientRect();
            lens.style.setProperty("--lx", `${event.clientX - r.left}px`);
            lens.style.setProperty("--ly", `${event.clientY - r.top}px`);
        };
        const splash = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest("a,button")) return;
            window.dispatchEvent(
                new CustomEvent<BurstDetail>(BURST_EVENT, {
                    detail: { x: event.clientX, y: event.clientY },
                })
            );
        };
        hero.addEventListener("pointerenter", enter);
        hero.addEventListener("pointerleave", leave);
        hero.addEventListener("pointermove", move);
        hero.addEventListener("click", splash);
        return () => {
            hero.removeEventListener("pointerenter", enter);
            hero.removeEventListener("pointerleave", leave);
            hero.removeEventListener("pointermove", move);
            hero.removeEventListener("click", splash);
        };
    }, []);

    return <div ref={ref} className="lens glass" aria-hidden="true" />;
};

interface LiveBarProps {
    labels: { inside: string; orders: string; cash: string };
}

// Example numbers that tick like a live club evening.
export const LiveBar = ({ labels }: LiveBarProps) => {
    const locale = useLocale();
    const [live, setLive] = useState({ inside: 23, orders: 64, cash: 1284.5 });
    const [bumped, setBumped] = useState<"inside" | "orders" | null>(null);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = window.setInterval(() => {
            if (Math.random() < 0.45) {
                setLive((v) => ({ ...v, inside: v.inside + (Math.random() < 0.7 ? 1 : -1) }));
                setBumped("inside");
            } else {
                const ticket = [7.5, 8, 15, 6.5][Math.floor(Math.random() * 4)] ?? 7.5;
                setLive((v) => ({ ...v, orders: v.orders + 1, cash: v.cash + ticket }));
                setBumped("orders");
            }
            window.setTimeout(() => setBumped(null), 600);
        }, 3200);
        return () => window.clearInterval(timer);
    }, []);

    const number = new Intl.NumberFormat(locale);
    const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });

    return (
        <div className="livebar glass fade-late">
            <div>
                <small>
                    <i />
                    <span>{labels.inside}</span>
                </small>
                <b className={bumped === "inside" ? "bump" : undefined}>
                    {number.format(live.inside)}
                </b>
            </div>
            <div>
                <small>{labels.orders}</small>
                <b className={bumped === "orders" ? "bump" : undefined}>
                    {number.format(live.orders)}
                </b>
            </div>
            <div>
                <small>{labels.cash}</small>
                <b className={bumped === "orders" ? "bump" : undefined}>
                    {money.format(live.cash)}
                </b>
            </div>
        </div>
    );
};

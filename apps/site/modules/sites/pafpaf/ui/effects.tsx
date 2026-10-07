"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fades sections in and lets headings condense out of the smoke as they scroll into view.
export const Reveal = () => {
    const pathname = usePathname();

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add("in");
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px -10% 0px" }
        );
        document
            .querySelectorAll(".reveal:not(.in), .smoke-text:not(.now):not(.in)")
            .forEach((el) => observer.observe(el));
        const frame = requestAnimationFrame(() => {
            document.querySelectorAll(".smoke-text.now").forEach((el) => el.classList.add("in"));
        });
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [pathname]);

    return null;
};

// The specular highlight of liquid glass follows the pointer.
export const GlassLight = () => {
    useEffect(() => {
        const onMove = (event: PointerEvent) => {
            const target =
                event.target instanceof Element
                    ? event.target.closest<HTMLElement>(".glass")
                    : null;
            if (!target) return;
            const r = target.getBoundingClientRect();
            target.style.setProperty("--mx", `${((event.clientX - r.left) / r.width) * 100}%`);
            target.style.setProperty("--my", `${((event.clientY - r.top) / r.height) * 100}%`);
        };
        // Real refraction (SVG filter in backdrop-filter) renders only in Chromium.
        const brands =
            (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
                .userAgentData?.brands ?? [];
        if (brands.some((b) => /Chromium|Google Chrome|Microsoft Edge|Opera/.test(b.brand))) {
            document.documentElement.classList.add("refract");
        }
        document.addEventListener("pointermove", onMove, { passive: true });
        return () => document.removeEventListener("pointermove", onMove);
    }, []);

    return null;
};

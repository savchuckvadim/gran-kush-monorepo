"use client";

import { useEffect } from "react";

/**
 * Fixed layer behind the page: the skin's photo or grid, drifting blobs and a glow that follows
 * the pointer. Which pieces show is decided by the skin in globals.css.
 */
export const Backdrop = () => {
    useEffect(() => {
        const root = document.documentElement;
        let frame = 0;
        const onMove = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                root.style.setProperty("--mx", `${event.clientX}px`);
                root.style.setProperty("--my", `${event.clientY}px`);
                root.classList.add("has-pointer");
            });
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => {
            window.removeEventListener("pointermove", onMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div className="backdrop" aria-hidden>
            <div className="backdrop-photo" />
            <div className="backdrop-grid" />
            <div className="backdrop-blobs">
                <span />
                <span />
                <span />
            </div>
            <div className="backdrop-glow" />
        </div>
    );
};

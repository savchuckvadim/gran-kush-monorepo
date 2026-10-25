"use client";

import { type RefObject, useEffect, useRef } from "react";

export interface SceneSize {
    width: number;
    height: number;
    dpr: number;
}

export interface ScenePointer {
    /** Position inside the canvas, in CSS pixels; `inside` is false until the pointer arrives. */
    x: number;
    y: number;
    inside: boolean;
}

interface SceneOptions {
    /** Device pixel ratio cap: 2 for crisp 2D dots, lower for heavy shaders. */
    maxDpr?: number;
    /** Draws one frame. `time` is seconds since the loop started, `dt` since the previous frame. */
    render: (time: number, dt: number, size: SceneSize, pointer: ScenePointer) => void;
}

/**
 * Runs a canvas effect only while it is on screen and the tab is visible, sizes the canvas to its
 * box, and tracks the mouse. With «reduce motion» on, draws a single still frame instead of
 * animating. The render callback may change every render; the loop always calls the latest one.
 */
export const useCanvasScene = (
    canvasRef: RefObject<HTMLCanvasElement | null>,
    { maxDpr = 2, render }: SceneOptions
) => {
    const renderRef = useRef(render);
    useEffect(() => {
        renderRef.current = render;
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const size: SceneSize = { width: 0, height: 0, dpr: 1 };
        const pointer: ScenePointer = { x: 0, y: 0, inside: false };
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        let visible = false;
        let running = false;
        let frame = 0;
        let started = 0;
        let last = 0;

        const draw = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            renderRef.current((now - started) / 1000, dt, size, pointer);
        };

        const tick = (now: number) => {
            draw(now);
            frame = requestAnimationFrame(tick);
        };

        const still = () => {
            if (size.width > 0) renderRef.current(0, 0, size, pointer);
        };

        const sync = () => {
            const shouldRun = visible && !reduce.matches && document.visibilityState === "visible";
            if (shouldRun && !running) {
                running = true;
                started = last = performance.now();
                frame = requestAnimationFrame(tick);
            } else if (!shouldRun && running) {
                running = false;
                cancelAnimationFrame(frame);
            }
            if (!shouldRun && visible) still();
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            size.dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
            size.width = Math.max(1, Math.round(rect.width));
            size.height = Math.max(1, Math.round(rect.height));
            canvas.width = Math.round(size.width * size.dpr);
            canvas.height = Math.round(size.height * size.dpr);
            if (!running) still();
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
            pointer.inside =
                pointer.x >= 0 &&
                pointer.y >= 0 &&
                pointer.x <= rect.width &&
                pointer.y <= rect.height;
        };

        const observer = new IntersectionObserver(
            (entries) => {
                visible = entries.some((entry) => entry.isIntersecting);
                sync();
            },
            { rootMargin: "120px" }
        );
        const resizer = new ResizeObserver(resize);

        resize();
        observer.observe(canvas);
        resizer.observe(canvas);
        reduce.addEventListener("change", sync);
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("pointermove", onPointerMove, { passive: true });

        return () => {
            running = false;
            cancelAnimationFrame(frame);
            observer.disconnect();
            resizer.disconnect();
            reduce.removeEventListener("change", sync);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("pointermove", onPointerMove);
        };
    }, [canvasRef, maxDpr]);
};

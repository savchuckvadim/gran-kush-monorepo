"use client";

import { useEffect, useRef } from "react";

import { createFluid, type FluidOptions } from "@/modules/shared/vendor/fluid/fluid.js";

import {
    BURST_EVENT,
    type BurstDetail,
    isSmokeOff,
    type Mode,
    MODE_EVENT,
    readMode,
    SMOKE_EVENT,
} from "./mode";

// Dark: white smoke with a hint of the brand colours. Light: the same smoke as ink (inverted).
const SMOKE: Record<Mode, FluidOptions> = {
    dark: {
        colors: [
            [1, 1, 1],
            [0.66, 0.58, 1],
            [1, 0.6, 0.82],
            [1, 0.84, 0.6],
        ],
        intensity: 0.1,
        invert: false,
    },
    light: {
        colors: [
            [1, 1, 1],
            [0.58, 0.7, 0],
            [0, 0.69, 0.4],
            [0, 0.31, 0.77],
        ],
        intensity: 0.085,
        invert: true,
    },
};

const AMBIENT_MS = 420;

export const SmokeLayer = () => {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            canvas.hidden = true;
            return;
        }
        const small = window.innerWidth < 700;
        const fluid = createFluid(canvas, {
            simResolution: small ? 96 : 128,
            dyeResolution: small ? 512 : 1024,
            densityDissipation: 0.85,
            velocityDissipation: 0.3,
            curl: 26,
            splatRadius: 0.26,
            splatForce: 5600,
            ...SMOKE[readMode()],
        });
        if (!fluid) {
            canvas.hidden = true;
            return;
        }

        // Splats added while stopped would pile up and burst out on the next start.
        let ambient = 0;
        const sync = () => {
            window.clearInterval(ambient);
            if (document.hidden || isSmokeOff()) {
                fluid.stop();
            } else {
                fluid.start();
                ambient = window.setInterval(() => fluid.rise(1), AMBIENT_MS);
            }
        };
        sync();
        const firstPuff = window.setTimeout(() => {
            if (!isSmokeOff()) fluid.puff(7);
        }, 300);

        const onMove = (event: PointerEvent) => fluid.move(event.clientX, event.clientY);
        const onBurst = (event: Event) => {
            if (isSmokeOff()) return;
            const { x, y } = (event as CustomEvent<BurstDetail>).detail;
            fluid.burst(x, y, 12);
        };
        const onMode = () => fluid.setOptions(SMOKE[readMode()]);

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener(BURST_EVENT, onBurst);
        window.addEventListener(MODE_EVENT, onMode);
        window.addEventListener(SMOKE_EVENT, sync);
        document.addEventListener("visibilitychange", sync);

        return () => {
            window.clearTimeout(firstPuff);
            window.clearInterval(ambient);
            fluid.stop();
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener(BURST_EVENT, onBurst);
            window.removeEventListener(MODE_EVENT, onMode);
            window.removeEventListener(SMOKE_EVENT, sync);
            document.removeEventListener("visibilitychange", sync);
        };
    }, []);

    return <canvas ref={ref} className="smoke" aria-hidden="true" />;
};

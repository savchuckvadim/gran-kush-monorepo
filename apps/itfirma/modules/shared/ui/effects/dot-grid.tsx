"use client";

import { useEffect, useRef } from "react";

import { rgba } from "../color";
import { useSkinColors } from "../use-skin-colors";

import { useCanvasScene } from "./use-canvas-scene";

const GAP = 26;
const REACH = 170;
const BASE_RADIUS = 1.1;
const ACTIVE_RADIUS = 2.6;

interface DotGridProps {
    className?: string;
}

/** A field of small dots that swell under the mouse and breathe slowly on their own. */
export const DotGrid = ({ className }: DotGridProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const colors = useSkinColors();
    const colorsRef = useRef(colors);
    useEffect(() => {
        colorsRef.current = colors;
    }, [colors]);

    useCanvasScene(canvasRef, {
        render: (time, _dt, size, pointer) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
            ctx.clearRect(0, 0, size.width, size.height);
            const { foreground, primary } = colorsRef.current;
            const columns = Math.ceil(size.width / GAP) + 1;
            const rows = Math.ceil(size.height / GAP) + 1;
            for (let row = 0; row < rows; row += 1) {
                for (let column = 0; column < columns; column += 1) {
                    const x = column * GAP;
                    const y = row * GAP;
                    const breath = 0.5 + 0.5 * Math.sin(time * 0.8 + (x + y) * 0.012);
                    let radius = BASE_RADIUS + breath * 0.35;
                    let alpha = 0.16 + breath * 0.08;
                    let color = foreground;
                    if (pointer.inside) {
                        const dx = x - pointer.x;
                        const dy = y - pointer.y;
                        const distance = Math.hypot(dx, dy);
                        if (distance < REACH) {
                            const k = 1 - distance / REACH;
                            const ease = k * k * (3 - 2 * k);
                            radius += (ACTIVE_RADIUS - BASE_RADIUS) * ease;
                            alpha += 0.6 * ease;
                            color = primary;
                        }
                    }
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = rgba(color, alpha);
                    ctx.fill();
                }
            }
        },
    });

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className={["pointer-events-none absolute inset-0 h-full w-full", className]
                .filter(Boolean)
                .join(" ")}
        />
    );
};

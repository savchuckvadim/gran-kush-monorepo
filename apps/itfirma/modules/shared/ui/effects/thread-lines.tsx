"use client";

import { useEffect, useRef } from "react";

import { rgba } from "../color";
import { useSkinColors } from "../use-skin-colors";

import { useCanvasScene } from "./use-canvas-scene";

const LINES = 22;
const SEGMENT = 14;
const POINTER_REACH = 220;

interface ThreadLinesProps {
    className?: string;
}

/** Horizontal threads that ripple slowly and bend away from the mouse, like strings in air. */
export const ThreadLines = ({ className }: ThreadLinesProps) => {
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
            const { primary, foreground } = colorsRef.current;
            const gap = size.height / (LINES + 1);
            ctx.lineWidth = 1;
            for (let line = 0; line < LINES; line += 1) {
                const baseY = gap * (line + 1);
                const phase = line * 0.45;
                const weight = 0.5 + 0.5 * Math.sin(time * 0.35 + phase);
                ctx.beginPath();
                for (let x = 0; x <= size.width + SEGMENT; x += SEGMENT) {
                    const wave =
                        Math.sin(x * 0.006 + time * 0.9 + phase) * 9 +
                        Math.sin(x * 0.013 - time * 0.6 + phase * 1.7) * 4;
                    let bend = 0;
                    if (pointer.inside) {
                        const dx = x - pointer.x;
                        const dy = baseY - pointer.y;
                        const distance = Math.hypot(dx, dy);
                        if (distance < POINTER_REACH) {
                            const k = 1 - distance / POINTER_REACH;
                            bend = Math.sign(dy || 1) * k * k * 28;
                        }
                    }
                    const y = baseY + wave + bend;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                const tint = line % 3 === 0 ? primary : foreground;
                ctx.strokeStyle = rgba(tint, 0.08 + weight * 0.14);
                ctx.stroke();
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

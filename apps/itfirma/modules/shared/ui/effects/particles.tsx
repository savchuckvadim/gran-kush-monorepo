"use client";

import { useEffect, useRef } from "react";

import { rgba } from "../color";
import { useSkinColors } from "../use-skin-colors";

import { useCanvasScene } from "./use-canvas-scene";

const COUNT = 110;
const REACH = 140;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    tint: 0 | 1;
}

const seed = (width: number, height: number): Particle[] =>
    Array.from({ length: COUNT }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 12,
        vy: -8 - Math.random() * 14,
        size: 1 + Math.random() * 1.8,
        tint: index % 4 === 0 ? 1 : 0,
    }));

interface ParticlesProps {
    className?: string;
}

/** Slow sparks drifting upward; the mouse pushes them aside. */
export const Particles = ({ className }: ParticlesProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[] | null>(null);
    const colors = useSkinColors();
    const colorsRef = useRef(colors);
    useEffect(() => {
        colorsRef.current = colors;
    }, [colors]);

    useCanvasScene(canvasRef, {
        render: (_time, dt, size, pointer) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            if (!particlesRef.current) particlesRef.current = seed(size.width, size.height);
            const particles = particlesRef.current;
            const { primary, foreground } = colorsRef.current;
            ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
            ctx.clearRect(0, 0, size.width, size.height);
            for (const particle of particles) {
                if (dt > 0) {
                    particle.x += particle.vx * dt;
                    particle.y += particle.vy * dt;
                    if (pointer.inside) {
                        const dx = particle.x - pointer.x;
                        const dy = particle.y - pointer.y;
                        const distance = Math.hypot(dx, dy) || 1;
                        if (distance < REACH) {
                            const push = ((REACH - distance) / REACH) * 60 * dt;
                            particle.x += (dx / distance) * push;
                            particle.y += (dy / distance) * push;
                        }
                    }
                    if (particle.y < -4) {
                        particle.y = size.height + 4;
                        particle.x = Math.random() * size.width;
                    }
                    if (particle.x < -4) particle.x = size.width + 4;
                    if (particle.x > size.width + 4) particle.x = -4;
                }
                const edge = Math.min(particle.y, size.height - particle.y) / size.height;
                const alpha = 0.25 + Math.min(0.5, edge * 3);
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = rgba(particle.tint ? primary : foreground, alpha);
                ctx.fill();
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

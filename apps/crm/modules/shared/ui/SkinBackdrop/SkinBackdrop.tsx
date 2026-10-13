"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useSkin } from "@/modules/shared/providers/skin-provider";

import { createStarfield, type Starfield } from "./starfield";

type CustomProperties = React.CSSProperties & Record<`--${string}`, string>;

// Seeded so the server and the client render the same embers.
const createEmbers = (count: number): CustomProperties[] => {
    let seed = 7;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
    return Array.from({ length: count }, () => ({
        "--x": `${Math.round(random() * 100)}%`,
        "--s": `${(2 + random() * 3).toFixed(1)}px`,
        "--t": `${(7 + random() * 7).toFixed(1)}s`,
        "--d": `${(-random() * 14).toFixed(1)}s`,
        "--sway": `${Math.round(random() * 80 - 40)}px`,
    }));
};

const EMBERS = createEmbers(18);

function Stars({ active }: { active: boolean }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const starfieldRef = React.useRef<Starfield | null>(null);
    const pathname = usePathname();
    const lastPathname = React.useRef(pathname);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!active || !canvas) return;
        const starfield = createStarfield(canvas, {
            reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
        starfieldRef.current = starfield;
        return () => {
            starfield.destroy();
            starfieldRef.current = null;
        };
    }, [active]);

    React.useEffect(() => {
        if (lastPathname.current === pathname) return;
        lastPathname.current = pathname;
        starfieldRef.current?.warp();
    }, [pathname]);

    return <canvas ref={canvasRef} data-fx="stars" />;
}

/**
 * Decorative layer behind the app. Static layers are shown by skins.css from data-skin on
 * <html> (already set before paint); only the starfield needs JS. Energy saving hides it all.
 */
export function SkinBackdrop() {
    const { skin, isEcoActive } = useSkin();

    return (
        <>
            <div data-slot="skin-fx" aria-hidden="true">
                <Stars active={skin === "galaxia" && !isEcoActive} />
                <div data-fx="photo" />
                <div data-fx="blobs">
                    <span />
                    <span />
                    <span />
                </div>
                <div data-fx="embers">
                    {EMBERS.map((style, index) => (
                        <span key={index} style={style} />
                    ))}
                </div>
                {/* Coqueta: hearts drift up on the same seeded positions as the embers */}
                <div data-fx="hearts">
                    {EMBERS.map((style, index) => (
                        <span key={index} style={style} />
                    ))}
                </div>
                <svg
                    data-fx="geo"
                    viewBox="-100 -100 200 200"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.45}
                >
                    <circle r={97} />
                    <circle r={72} />
                    <circle r={48} />
                    <g data-gold="">
                        <path d="M0 -97 L84 48.5 L-84 48.5 Z" />
                        <path d="M0 97 L-84 -48.5 L84 -48.5 Z" />
                    </g>
                    <circle r={24} />
                    <circle cx={24} cy={0} r={24} />
                    <circle cx={12} cy={20.8} r={24} />
                    <circle cx={-12} cy={20.8} r={24} />
                    <circle cx={-24} cy={0} r={24} />
                    <circle cx={-12} cy={-20.8} r={24} />
                    <circle cx={12} cy={-20.8} r={24} />
                    <g data-gold="">
                        <circle r={4} />
                    </g>
                </svg>
            </div>
            {/* Grind headings: `filter: url(#skin-rough)` in skins.css */}
            <svg aria-hidden="true" focusable="false" width={0} height={0} className="absolute">
                <filter id="skin-rough">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency={0.9}
                        numOctaves={2}
                        seed={3}
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale={2.6}
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </svg>
        </>
    );
}

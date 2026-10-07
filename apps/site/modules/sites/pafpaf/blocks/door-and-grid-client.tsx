"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

// Cycles the phone through QR → member check → entry recorded while it is on screen.
export const PhoneCycle = ({ children }: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let timer = 0;
        const observer = new IntersectionObserver(
            ([entry]) => {
                window.clearInterval(timer);
                if (entry?.isIntersecting)
                    timer = window.setInterval(() => setStep((s) => (s + 1) % 3), 2400);
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => {
            window.clearInterval(timer);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="vis" ref={ref} data-step={step}>
            {children}
        </div>
    );
};

// A liquid drop slides under the hovered glass card and merges with it (goo filter).
export const GooGrid = ({ children }: { children: ReactNode }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const gooRef = useRef<HTMLDivElement>(null);
    const blobRef = useRef<HTMLSpanElement>(null);
    const trailRef = useRef<HTMLSpanElement>(null);
    const [hot, setHot] = useState(false);

    const onOver = (event: React.PointerEvent<HTMLDivElement>) => {
        const card =
            event.target instanceof Element ? event.target.closest<HTMLElement>(".gcard") : null;
        const goo = gooRef.current;
        const blob = blobRef.current;
        const trail = trailRef.current;
        if (!card || !goo || !blob || !trail) return;
        const g = goo.getBoundingClientRect();
        const r = card.getBoundingClientRect();
        const x = r.left - g.left;
        const y = r.top - g.top;
        Object.assign(blob.style, {
            left: `${x + 10}px`,
            top: `${y + 10}px`,
            width: `${r.width - 20}px`,
            height: `${r.height - 20}px`,
        });
        Object.assign(trail.style, {
            left: `${x + r.width / 2 - 40}px`,
            top: `${y + r.height / 2 - 40}px`,
            width: "80px",
            height: "80px",
        });
        setHot(true);
    };

    return (
        <div
            className={`ggrid${hot ? " is-hot" : ""}`}
            ref={gridRef}
            onPointerOver={onOver}
            onPointerLeave={() => setHot(false)}
        >
            <div className="ggrid__goo" ref={gooRef} aria-hidden="true">
                <span className="ggrid__blob" ref={blobRef} />
                <span className="ggrid__trail" ref={trailRef} />
            </div>
            {children}
        </div>
    );
};

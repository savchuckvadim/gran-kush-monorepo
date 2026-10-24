"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

interface RevealProps {
    children: ReactNode;
    className?: string;
    /** Stagger inside a group, in milliseconds. */
    delay?: number;
    /** `li` when the block is an item of a list. */
    as?: "div" | "li";
}

/** Fades the block in the first time it scrolls into view. */
export const Reveal = ({ children, className, delay = 0, as: Tag = "div" }: RevealProps) => {
    const nodeRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add("is-in");
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const setNode = (node: HTMLElement | null) => {
        nodeRef.current = node;
    };

    const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

    return (
        <Tag
            ref={setNode}
            className={["reveal", className].filter(Boolean).join(" ")}
            style={style}
        >
            {children}
        </Tag>
    );
};

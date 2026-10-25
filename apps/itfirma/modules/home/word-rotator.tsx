"use client";

import { useEffect, useState } from "react";

interface WordRotatorProps {
    words: readonly string[];
    /** Milliseconds a word stays. */
    interval?: number;
}

/** One word at a time slides up and out, the next slides in (the `.rotator` rules). */
export const WordRotator = ({ words, interval = 2600 }: WordRotatorProps) => {
    const [index, setIndex] = useState(0);
    const [previous, setPrevious] = useState<number | null>(null);

    useEffect(() => {
        if (words.length < 2) return;
        const timer = setInterval(() => {
            setIndex((current) => {
                setPrevious(current);
                return (current + 1) % words.length;
            });
        }, interval);
        return () => clearInterval(timer);
    }, [words.length, interval]);

    return (
        <span className="rotator text-primary" aria-live="off">
            {words.map((word, i) => (
                <span
                    key={word}
                    data-active={i === index}
                    data-leaving={i === previous}
                    aria-hidden={i !== index}
                >
                    {word}
                </span>
            ))}
        </span>
    );
};

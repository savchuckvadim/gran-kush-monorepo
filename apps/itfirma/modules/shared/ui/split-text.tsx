import type { CSSProperties } from "react";

interface SplitTextProps {
    text: string;
    className?: string;
}

/**
 * Words rising one after another on load (the `.split-word` rules); plain text without motion.
 * The space lives outside the clipped wrapper, otherwise the browser drops it and the words glue.
 */
export const SplitText = ({ text, className }: SplitTextProps) => (
    <span className={className} aria-label={text}>
        {text.split(" ").map((word, index) => (
            <span key={`${word}-${index}`} aria-hidden>
                <span className="split-wrap">
                    <span className="split-word" style={{ "--i": index } as CSSProperties}>
                        {word}
                    </span>
                </span>{" "}
            </span>
        ))}
    </span>
);

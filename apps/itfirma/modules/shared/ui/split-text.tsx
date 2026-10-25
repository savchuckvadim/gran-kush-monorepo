import type { CSSProperties } from "react";

interface SplitTextProps {
    text: string;
    className?: string;
}

/** Words rising one after another on load (the `.split-word` rules); plain text without motion. */
export const SplitText = ({ text, className }: SplitTextProps) => (
    <span className={className} aria-label={text}>
        {text.split(" ").map((word, index) => (
            <span key={`${word}-${index}`} className="split-wrap" aria-hidden>
                <span className="split-word" style={{ "--i": index } as CSSProperties}>
                    {word}
                </span>{" "}
            </span>
        ))}
    </span>
);

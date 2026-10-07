import { createElement, type CSSProperties, Fragment } from "react";

interface Letter {
    char: string;
    index: number;
}

type Token = { space: true } | { space: false; letters: Letter[] };

const splitLetters = (text: string): Token[][] => {
    let index = 0;
    return text.split("\n").map((line) =>
        line
            .split(/(\s+)/)
            .filter(Boolean)
            .map((part): Token => {
                if (/^\s+$/.test(part)) return { space: true };
                return {
                    space: false,
                    letters: Array.from(part).map((char) => {
                        index += 1;
                        return { char, index };
                    }),
                };
            })
    );
};

interface SmokeTextProps {
    as?: "h1" | "h2" | "p";
    text: string;
    className?: string;
    // reveal on load instead of on scroll (first screen)
    now?: boolean;
}

// Letters condense out of the smoke one by one. The full text stays in the heading for readers and search.
export const SmokeText = ({ as = "h2", text, className, now }: SmokeTextProps) => {
    const lines = splitLetters(text);
    return createElement(
        as,
        {
            className: ["smoke-text", now && "now", className].filter(Boolean).join(" "),
            "aria-label": text.replace(/\n/g, " "),
        },
        lines.map((tokens, lineIndex) => (
            <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {tokens.map((token, tokenIndex) =>
                    token.space ? (
                        " "
                    ) : (
                        <span className="w" key={tokenIndex} aria-hidden="true">
                            {token.letters.map((letter) => (
                                <span
                                    className="ch"
                                    key={letter.index}
                                    style={{ "--i": letter.index } as CSSProperties}
                                >
                                    {letter.char}
                                </span>
                            ))}
                        </span>
                    )
                )}
            </Fragment>
        ))
    );
};

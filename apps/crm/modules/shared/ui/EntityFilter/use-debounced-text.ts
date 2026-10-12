"use client";

import { useEffect, useEffectEvent, useState } from "react";

/**
 * Input text that commits after a pause in typing. When the commit comes back as the new
 * `value`, the draft stays as it is (the viewer may be typing on); any other new value — a
 * removed chip, «Reset» — replaces the draft.
 */
export function useDebouncedText(value: string, onCommit: (next: string) => void, delay = 300) {
    const [draft, setDraft] = useState(value);
    const [seen, setSeen] = useState(value);
    const [committed, setCommitted] = useState(value);

    if (value !== seen) {
        setSeen(value);
        if (value !== committed) {
            setDraft(value);
            setCommitted(value);
        }
    }

    const commitLater = useEffectEvent((next: string) => {
        setCommitted(next);
        onCommit(next);
    });

    useEffect(() => {
        if (draft === committed) return;
        const timer = window.setTimeout(() => commitLater(draft), delay);
        return () => window.clearTimeout(timer);
    }, [draft, committed, delay]);

    /** Enter: no waiting for the pause. */
    const flush = () => {
        if (draft === committed) return;
        setCommitted(draft);
        onCommit(draft);
    };

    return { draft, setDraft, flush };
}

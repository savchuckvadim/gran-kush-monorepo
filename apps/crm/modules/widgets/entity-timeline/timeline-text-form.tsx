"use client";

import { useState } from "react";

import { Button } from "@workspace/ui";

/** Длина комментария — как на API (`COMMENT_BODY_MAX`). */
const BODY_MAX = 4000;

interface TimelineTextFormProps {
    initial?: string;
    placeholder?: string;
    hint?: string;
    submitLabel: string;
    pendingLabel: string;
    pending: boolean;
    /** `reset` очищает поле после успешной отправки */
    onSubmit: (body: string, reset: () => void) => void;
    onCancel?: () => void;
    cancelLabel?: string;
    autoFocus?: boolean;
}

/** Поле комментария: новый в таймлайне и правка своего. Ctrl+Enter — отправить. */
export function TimelineTextForm({
    initial = "",
    placeholder,
    hint,
    submitLabel,
    pendingLabel,
    pending,
    onSubmit,
    onCancel,
    cancelLabel,
    autoFocus,
}: TimelineTextFormProps) {
    const [text, setText] = useState(initial);
    const submit = () => {
        const body = text.trim();
        if (!body || pending) return;
        onSubmit(body, () => setText(""));
    };

    return (
        <div className="space-y-2">
            <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        submit();
                    }
                }}
                placeholder={placeholder}
                maxLength={BODY_MAX}
                rows={2}
                autoFocus={autoFocus}
                className="min-h-16 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                <div className="ml-auto flex gap-2">
                    {onCancel && (
                        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
                            {cancelLabel}
                        </Button>
                    )}
                    <Button size="sm" onClick={submit} disabled={pending || !text.trim()}>
                        {pending ? pendingLabel : submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { Check } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

export type FormStepState = "done" | "current" | "upcoming";

export interface FormStepProps {
    number: number;
    title: string;
    state: FormStepState;
    /** The last step draws no connector after itself */
    last: boolean;
    /** Set when the step can be opened by a click */
    onSelect?: () => void;
}

/** One step of {@link FormSteps}: a numbered circle (a check once done), its title, a connector. */
export function FormStep({ number, title, state, last, onSelect }: FormStepProps) {
    const content = (
        <>
            <span
                className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
                    state === "current" && "border-primary bg-primary text-primary-foreground",
                    state === "done" && "border-primary text-primary",
                    state === "upcoming" && "border-border bg-muted text-muted-foreground"
                )}
            >
                {state === "done" ? <Check className="size-4" aria-hidden="true" /> : number}
            </span>
            <span
                className={cn(
                    "text-sm",
                    state === "current"
                        ? "shrink-0 font-medium whitespace-nowrap text-foreground"
                        : "hidden truncate text-muted-foreground sm:inline"
                )}
            >
                {title}
            </span>
        </>
    );

    // The current step keeps its whole title; the others give way and truncate first
    return (
        <li
            className={cn(
                "flex items-center gap-2",
                !last && "flex-1",
                state !== "current" && "min-w-0"
            )}
            aria-current={state === "current" ? "step" : undefined}
        >
            {onSelect ? (
                <button
                    type="button"
                    onClick={onSelect}
                    className="flex min-w-0 items-center gap-2 rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {content}
                </button>
            ) : (
                <span className={cn("flex items-center gap-2", state !== "current" && "min-w-0")}>
                    {content}
                </span>
            )}
            {!last && (
                <span
                    aria-hidden="true"
                    className={cn(
                        "h-px min-w-4 flex-1",
                        state === "done" ? "bg-primary" : "bg-border"
                    )}
                />
            )}
        </li>
    );
}

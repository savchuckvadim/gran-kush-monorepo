import type { HTMLAttributes } from "react";

import { cn } from "@workspace/ui/lib/utils";

/** A row of {@link StageStep} chevrons; scrolls sideways when the stages do not fit. */
export function StageSteps({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="group"
            data-slot="stage-steps"
            className={cn("flex w-full gap-0.5 overflow-x-auto pb-1", className)}
            {...props}
        >
            {children}
        </div>
    );
}

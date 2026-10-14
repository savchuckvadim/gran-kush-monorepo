import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const badgeVariants = cva(
    "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground",
                secondary: "bg-secondary text-secondary-foreground",
                outline: "border border-border text-foreground",
                success: "bg-success/15 text-success-text",
                warning: "bg-warning/15 text-warning-text",
                destructive: "bg-destructive/15 text-destructive",
            },
        },
        defaultVariants: { variant: "secondary" },
    }
);

export interface BadgeProps
    extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span
            data-slot="badge"
            data-variant={variant ?? "secondary"}
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };

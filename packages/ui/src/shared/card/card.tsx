import { forwardRef, HTMLAttributes, ReactNode } from "react";

import {
    Card as UICard,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    headerIcon?: ReactNode;
    headerClassName?: string;
    contentClassName?: string;
    padding?: "sm" | "md" | "lg";
    variant?: "default" | "outlined" | "elevated";
    children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            title,
            description,
            headerIcon,
            headerClassName,
            contentClassName,
            padding = "md",
            variant = "default",
            children,
            ...props
        },
        ref
    ) => {
        const paddingClasses = {
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
        };

        const variantClasses = {
            default: "",
            outlined: "border",
            elevated: "shadow-md",
        };

        const hasHeader = title || description || headerIcon;

        return (
            <UICard
                ref={ref}
                className={cn(paddingClasses[padding], variantClasses[variant], className)}
                {...props}
            >
                {hasHeader && (
                    <CardHeader className={cn("space-y-2", headerClassName)}>
                        {headerIcon}
                        {title && <CardTitle className="text-3xl">{title}</CardTitle>}
                        {description && <CardDescription>{description}</CardDescription>}
                    </CardHeader>
                )}
                <CardContent className={contentClassName ?? "px-0"}>{children}</CardContent>
            </UICard>
        );
    }
);

Card.displayName = "Card";

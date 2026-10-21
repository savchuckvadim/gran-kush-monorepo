"use client";

import type { ReactNode } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

const WIDTH = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-2xl",
} as const;

// The dialog primitive restyled as a full-height panel on the right.
const SHEET =
    "top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none border-y-0 border-r-0 p-5 sm:max-w-md data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right";

export interface ModalDialogProps {
    /** Controlled open state; leave both out to let `trigger` open the dialog */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** The element that opens the dialog (wrapped with `asChild`) */
    trigger?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** Actions under the content: right-aligned on wide screens, stacked on a phone */
    footer?: ReactNode;
    /** Width on wide screens; on a phone the dialog takes the screen width */
    size?: keyof typeof WIDTH;
    /** `sheet` slides in from the right at full height — for settings and pickers */
    variant?: "dialog" | "sheet";
    /** Long content scrolls between the fixed title and actions instead of leaving the screen */
    scrollable?: boolean;
    className?: string;
    children: ReactNode;
}

/**
 * A dialog with a title, an optional description and actions — the set every dialog of the apps
 * repeats. Build dialogs from this, not from the `Dialog*` primitives; "are you sure?" is
 * {@link ConfirmDialog}.
 */
export function ModalDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    footer,
    size = "lg",
    variant = "dialog",
    scrollable = false,
    className,
    children,
}: ModalDialogProps) {
    const scrollsBody = scrollable && variant === "dialog";
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
            <DialogContent
                className={cn(
                    variant === "sheet" ? SHEET : WIDTH[size],
                    scrollsBody && "flex max-h-[90dvh] flex-col",
                    className
                )}
            >
                <DialogHeader className={variant === "sheet" ? "pr-8" : undefined}>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                {scrollsBody ? (
                    // The padding moves inside the scroll area: focus rings are not cut off
                    <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 py-1">{children}</div>
                ) : (
                    children
                )}
                {footer ? <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter> : null}
            </DialogContent>
        </Dialog>
    );
}

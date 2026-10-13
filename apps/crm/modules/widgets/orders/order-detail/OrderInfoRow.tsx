import type { ReactNode } from "react";

interface OrderInfoRowProps {
    label: ReactNode;
    children: ReactNode;
}

/** A label on the left, the value on the right. */
export function OrderInfoRow({ label, children }: OrderInfoRowProps) {
    return (
        <div className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium">{children}</dd>
        </div>
    );
}

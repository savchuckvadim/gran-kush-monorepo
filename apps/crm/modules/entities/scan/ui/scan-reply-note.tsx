import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import type { ScanReply } from "@/modules/shared/lib/scan";

/** Итог скана одной строкой: добавлено, выбран участник или почему код не подошёл. */
export function ScanReplyNote({ reply, className }: { reply: ScanReply; className?: string }) {
    const Icon = reply.ok ? CheckCircle2 : XCircle;
    return (
        <p
            role={reply.ok ? "status" : "alert"}
            className={cn(
                "flex items-start gap-2 rounded-md border p-2.5 text-sm",
                reply.ok
                    ? "border-success/40 bg-success/15 text-success-text"
                    : "border-destructive bg-destructive/10 text-destructive",
                className
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{reply.message}</span>
        </p>
    );
}

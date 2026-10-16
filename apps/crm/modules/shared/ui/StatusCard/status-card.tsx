import { CheckCircle2 } from "lucide-react";

import { Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

interface StatusCardProps {
    title?: string;
    text: string;
    /** success — галочка над заголовком; error — текст красным и объявляется читалке экрана. */
    tone?: "default" | "success" | "error";
    /** Кнопки под текстом (например, «Следующий» на киоске). */
    children?: React.ReactNode;
}

/** Итог или ошибка публичной страницы (ссылка клуба, приглашение) отдельной карточкой по центру. */
export function StatusCard({ title, text, tone = "default", children }: StatusCardProps) {
    return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 text-center">
                {tone === "success" && (
                    <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
                )}
                {title && (
                    <h1 className={cn("text-xl font-semibold", tone === "success" && "mt-3")}>
                        {title}
                    </h1>
                )}
                <p
                    role={tone === "error" ? "alert" : undefined}
                    className={cn(
                        "text-sm",
                        title && "mt-2",
                        tone === "error" ? "text-destructive" : "text-muted-foreground"
                    )}
                >
                    {text}
                </p>
                {children && <div className="mt-4">{children}</div>}
            </Card>
        </div>
    );
}

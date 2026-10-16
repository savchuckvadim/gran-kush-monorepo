import { Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

interface InviteMessageProps {
    title?: string;
    text: string;
    tone?: "default" | "error";
}

/** Итог или ошибка приглашения отдельной карточкой по центру страницы. */
export function InviteMessage({ title, text, tone = "default" }: InviteMessageProps) {
    return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 text-center">
                {title && <h1 className="text-xl font-semibold">{title}</h1>}
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
            </Card>
        </div>
    );
}

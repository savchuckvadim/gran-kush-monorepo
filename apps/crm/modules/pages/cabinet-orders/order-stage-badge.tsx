import type { SchemaCabinetOrderStageDto } from "@workspace/api-client/core";
import { Badge } from "@workspace/ui";

/** Стадия заказа так, как её назвал и раскрасил клуб. */
export function OrderStageBadge({
    stage,
    fallback,
}: {
    stage: SchemaCabinetOrderStageDto | null;
    fallback: string;
}) {
    if (!stage) return <Badge variant="outline">{fallback}</Badge>;
    return (
        <Badge variant="outline" className="gap-1.5">
            <span
                aria-hidden="true"
                className="size-2 rounded-full bg-muted-foreground"
                style={stage.color ? { backgroundColor: stage.color } : undefined}
            />
            {stage.name}
        </Badge>
    );
}

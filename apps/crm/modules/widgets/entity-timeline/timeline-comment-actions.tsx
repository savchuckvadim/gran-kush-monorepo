"use client";

import { useTranslations } from "next-intl";

import { Pencil, Pin, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

interface TimelineCommentActionsProps {
    pinned: boolean;
    canEdit: boolean;
    canDelete: boolean;
    busy: boolean;
    onPin: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

/** Кнопки комментария: закрепить — всем, изменить — автору, удалить — автору и администратору. */
export function TimelineCommentActions({
    pinned,
    canEdit,
    canDelete,
    busy,
    onPin,
    onEdit,
    onDelete,
}: TimelineCommentActionsProps) {
    const t = useTranslations("crm.timeline.comment");
    const action = (label: string, icon: ReactNode, onClick: () => void, active = false) => (
        <Button
            size="icon"
            variant="ghost"
            className={cn("size-7 [&_svg]:size-3.5", active && "text-primary")}
            onClick={onClick}
            disabled={busy}
            aria-label={label}
            aria-pressed={active || undefined}
            title={label}
        >
            {icon}
        </Button>
    );

    return (
        <div className="flex gap-0.5">
            {action(pinned ? t("unpin") : t("pin"), <Pin />, onPin, pinned)}
            {canEdit && action(t("edit"), <Pencil />, onEdit)}
            {canDelete && action(t("delete"), <Trash2 />, onDelete)}
        </div>
    );
}

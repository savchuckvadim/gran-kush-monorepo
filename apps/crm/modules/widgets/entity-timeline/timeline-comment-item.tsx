"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { ConfirmDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    type TimelineComment,
    type TimelineSubject,
    useDeleteComment,
    useEditComment,
    usePinComment,
} from "@/modules/entities/timeline";

import { TimelineCommentActions } from "./timeline-comment-actions";
import { TimelineRow } from "./timeline-row";
import { TimelineTextForm } from "./timeline-text-form";

interface TimelineCommentItemProps {
    comment: TimelineComment;
    subject: TimelineSubject;
    last: boolean;
}

/** Комментарий сотрудника: автор, текст, «изменено»; удалённый — отметкой без текста. */
export function TimelineCommentItem({ comment, subject, last }: TimelineCommentItemProps) {
    const t = useTranslations("crm.timeline.comment");
    const { can, employeeId } = usePermissions();
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const edit = useEditComment(subject);
    const pin = usePinComment(subject);
    const remove = useDeleteComment(subject);
    const failed = (error: unknown) => toast.error(getApiErrorMessage(error));
    const mine = comment.author !== null && comment.author.id === employeeId;
    const deleted = comment.body === null;

    return (
        <TimelineRow
            icon={<MessageSquare aria-hidden="true" />}
            tone="bg-muted text-foreground"
            at={comment.createdAt}
            last={last}
        >
            <div className="rounded-xl border bg-card px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                            {comment.author?.name ?? "—"}
                        </span>
                        {comment.editedAt && ` · ${t("edited")}`}
                    </span>
                    {!deleted && !editing && (
                        <TimelineCommentActions
                            pinned={comment.pinnedAt !== null}
                            canEdit={mine}
                            canDelete={mine || can("settings.club")}
                            busy={pin.isPending || remove.isPending}
                            onPin={() =>
                                pin.mutate(
                                    { id: comment.id, pinned: comment.pinnedAt === null },
                                    { onError: failed }
                                )
                            }
                            onEdit={() => setEditing(true)}
                            onDelete={() => setConfirming(true)}
                        />
                    )}
                </div>
                {deleted ? (
                    <p className="text-sm text-muted-foreground italic">{t("deleted")}</p>
                ) : editing ? (
                    <TimelineTextForm
                        initial={comment.body ?? ""}
                        submitLabel={t("save")}
                        pendingLabel={t("save")}
                        cancelLabel={t("cancel")}
                        pending={edit.isPending}
                        autoFocus
                        onCancel={() => setEditing(false)}
                        onSubmit={(body) =>
                            edit.mutate(
                                { id: comment.id, body },
                                { onSuccess: () => setEditing(false), onError: failed }
                            )
                        }
                    />
                ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{comment.body}</p>
                )}
            </div>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t("deleteTitle")}
                description={t("deleteDescription")}
                confirmLabel={t("delete")}
                cancelLabel={t("cancel")}
                pending={remove.isPending}
                tone="destructive"
                onConfirm={() =>
                    remove.mutate(comment.id, {
                        onSuccess: () => setConfirming(false),
                        onError: failed,
                    })
                }
            />
        </TimelineRow>
    );
}

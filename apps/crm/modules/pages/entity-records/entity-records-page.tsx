"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog, ModalDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { type EntityRecord, useDeleteEntityRecord } from "@/modules/entities/entity-records";
import { useEntityDefinitions, useEntityStageCategories } from "@/modules/entities/entity-settings";
import { getApiErrorMessage, pickFunnel, useBoardView } from "@/modules/shared";
import { BoardViewSwitch } from "@/modules/shared/ui/BoardViewSwitch";
import { ListPage } from "@/modules/shared/ui/ListPage";

import { RecordForm } from "./record-form";
import { RecordsKanban } from "./records-kanban";
import { RecordsList } from "./records-list";
import { RecordsToolbar } from "./records-toolbar";
import { useRecordFilters } from "./use-record-filters";

/**
 * A smart process: its records as a table or a kanban of one funnel. The funnel, the view and
 * the filter live in the address; a new record starts in the first stage of the chosen funnel.
 */
export function EntityRecordsPage({ code }: { code: string }) {
    const t = useTranslations("crm.records");
    const { can } = usePermissions();
    const canWrite = can("records.write");
    const canDelete = can("records.delete");
    const { view, setView, funnelId, setFunnelId } = useBoardView("crm.records.view");
    const filters = useRecordFilters(code);

    const { data: definitions } = useEntityDefinitions();
    const { data: funnels = [], isPending: isFunnelsPending } = useEntityStageCategories(code);
    const funnel = pickFunnel(funnels, funnelId);
    const stages = useMemo(
        () => [...(funnel?.stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [funnel]
    );

    // the dialog keeps its record while it fades out
    const [editing, setEditing] = useState<EntityRecord | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleting, setDeleting] = useState<EntityRecord | null>(null);
    const deleteMutation = useDeleteEntityRecord(code);

    const openRecord = (record: EntityRecord) => {
        setEditing(record);
        setIsEditOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) return;
        deleteMutation.mutate(deleting.id, {
            onSuccess: () => {
                toast.success(t("deleted"));
                setDeleting(null);
            },
            onError: (error) => {
                toast.error(getApiErrorMessage(error));
                setDeleting(null);
            },
        });
    };

    const renderToolbar = (info: { total?: number; isFetching: boolean }) => (
        <RecordsToolbar
            code={code}
            funnels={funnels}
            funnelId={funnel?.id}
            onFunnelChange={setFunnelId}
            filters={filters}
            total={info.total}
            isFetching={info.isFetching}
        />
    );

    return (
        <>
            <ListPage
                title={definitions?.find((definition) => definition.code === code)?.name ?? code}
                description={t("description")}
                actions={<BoardViewSwitch value={view} onChange={setView} />}
                create={
                    canWrite
                        ? {
                              label: t("create"),
                              title: t("create"),
                              size: "lg",
                              form: ({ close }) => (
                                  <RecordForm
                                      code={code}
                                      record={null}
                                      stageId={stages[0]?.id}
                                      canEdit
                                      onDone={close}
                                  />
                              ),
                          }
                        : undefined
                }
            >
                {isFunnelsPending || !filters.isReady ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2
                            className="size-6 animate-spin text-muted-foreground"
                            aria-hidden="true"
                        />
                    </div>
                ) : view === "kanban" ? (
                    <div className="space-y-3">
                        {renderToolbar({ isFetching: false })}
                        <RecordsKanban
                            code={code}
                            stages={stages}
                            filter={filters.filter}
                            canMove={canWrite}
                            onOpen={openRecord}
                        />
                    </div>
                ) : (
                    <RecordsList
                        code={code}
                        funnelId={funnel?.id}
                        stages={stages}
                        filter={filters.filter}
                        page={filters.page}
                        onPageChange={filters.setPage}
                        renderToolbar={renderToolbar}
                        canMove={canWrite}
                        canDelete={canDelete}
                        onOpen={openRecord}
                        onDelete={setDeleting}
                    />
                )}
            </ListPage>

            <ModalDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                title={t("editTitle")}
                size="lg"
                scrollable
            >
                {editing ? (
                    <RecordForm
                        key={editing.id}
                        code={code}
                        record={editing}
                        canEdit={canWrite}
                        onDone={() => setIsEditOpen(false)}
                    />
                ) : null}
            </ModalDialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t("deleteTitle")}
                description={t("deleteDescription")}
                confirmLabel={t("delete")}
                cancelLabel={t("cancel")}
                tone="destructive"
                pending={deleteMutation.isPending}
                onConfirm={confirmDelete}
            />
        </>
    );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { SchemaMemberLifecycleStatusItemDto } from "@workspace/api-client/core";
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";

import {
    CrmMemberDetails,
    useMemberStatusItems,
    useUpdateCrmMemberStatus,
} from "@/modules/entities/member";
import { notifyApiError } from "@/modules/shared";

const FALLBACK_COLOR = "#9ca3af";

interface MemberStatusSelectProps {
    member: CrmMemberDetails;
}

/** Смена lifecycle-статуса участника: dropdown с цветом + confirm. */
export function MemberStatusSelect({ member }: MemberStatusSelectProps) {
    const t = useTranslations("crm.members.statusSelect");
    const { data: statusItems } = useMemberStatusItems(true);
    const updateStatus = useUpdateCrmMemberStatus();
    const [pendingItem, setPendingItem] = useState<SchemaMemberLifecycleStatusItemDto | null>(null);

    const current = member.statusItem;

    const handleSelect = (statusItemId: string) => {
        const item = statusItems?.find((i) => i.id === statusItemId);
        if (!item || item.id === current?.id) {
            return;
        }
        setPendingItem(item);
    };

    const handleConfirm = async () => {
        if (!pendingItem) {
            return;
        }
        try {
            await updateStatus.mutateAsync({
                memberId: member.id,
                statusItemId: pendingItem.id,
            });
            setPendingItem(null);
        } catch (error) {
            notifyApiError(error, t("errorTitle"));
        }
    };

    return (
        <>
            <Select value={current?.id ?? ""} onValueChange={handleSelect}>
                <SelectTrigger size="sm" className="w-auto gap-2">
                    <span
                        className="inline-block size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: current?.color ?? FALLBACK_COLOR }}
                    />
                    <SelectValue placeholder={t("placeholder")}>
                        {current?.label ?? member.status}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {(statusItems ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                            <span
                                className="inline-block size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color ?? FALLBACK_COLOR }}
                            />
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog
                open={pendingItem !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingItem(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("confirmTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("confirmDescription", {
                                name: `${member.name} ${member.surname ?? ""}`.trim(),
                                status: pendingItem?.label ?? "",
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingItem(null)}
                            disabled={updateStatus.isPending}
                        >
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleConfirm} disabled={updateStatus.isPending}>
                            {updateStatus.isPending ? t("saving") : t("confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

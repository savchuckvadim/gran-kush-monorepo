"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ShoppingBasket, UserRound } from "lucide-react";

import {
    getApiErrorCode,
    newIdempotencyKey,
    type SchemaCheckInResultDto,
} from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { useConfirmDoorScan } from "@/modules/entities/presence";
import { type ScannedMember,ScanReplyNote } from "@/modules/entities/scan";
import { type EntityRef, newOrderRef, useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { personName } from "@/modules/shared/lib/person-name";
import { scannerStore } from "@/modules/shared/lib/scan";
import { QrPreviewCard } from "@/modules/widgets/attendance/scanner/QrPreviewCard";
import { ScanResultCard } from "@/modules/widgets/attendance/scanner/ScanResultCard";

/**
 * Участник по коду входа. Стойка — как в присутствии: предпросмотр, подтверждение тем же
 * действием и ключом идемпотентности. Рядом — новый заказ на участника и его карточка.
 */
export function MemberScanCard({
    member,
    code,
    onBack,
}: {
    member: ScannedMember;
    code: string;
    onBack: () => void;
}) {
    const t = useTranslations("crm.scanner");
    const tDoor = useTranslations("crm.attendance.scanner");
    const { can } = usePermissions();
    const openEntity = useOpenEntity();
    const confirm = useConfirmDoorScan();
    const [idempotencyKey] = useState(newIdempotencyKey);
    const [result, setResult] = useState<SchemaCheckInResultDto | null>(null);
    const person = member.member;

    if (result) return <ScanResultCard result={result} onReset={onBack} />;

    const open = (ref: EntityRef) => {
        scannerStore.close();
        openEntity(ref);
    };
    const confirmCode = getApiErrorCode(confirm.error);
    const confirmError =
        confirmCode && tDoor.has(`errors.${confirmCode}`)
            ? tDoor(`errors.${confirmCode}`)
            : tDoor("scanError");

    return (
        <div className="space-y-3">
            {can("presence.checkin") ? (
                <QrPreviewCard
                    preview={member}
                    isLoading={confirm.isPending}
                    onCancel={onBack}
                    onConfirm={() =>
                        confirm.mutate(
                            { body: { code, action: member.proposedAction }, idempotencyKey },
                            { onSuccess: setResult }
                        )
                    }
                />
            ) : (
                person && (
                    <p className="text-lg font-semibold">
                        {personName(person, t("unknownMember"))}
                    </p>
                )
            )}
            {confirm.isError && <ScanReplyNote reply={{ ok: false, message: confirmError }} />}
            {person && (
                <div className="flex flex-wrap gap-2">
                    {can("orders.create") && person.isActive && (
                        <Button
                            variant="outline"
                            onClick={() => open(newOrderRef({ memberId: person.id }))}
                        >
                            <ShoppingBasket aria-hidden="true" />
                            {t("actions.newOrder")}
                        </Button>
                    )}
                    {can("members.read") && (
                        <Button
                            variant="outline"
                            onClick={() => open({ kind: "member", id: person.id })}
                        >
                            <UserRound aria-hidden="true" />
                            {t("actions.openMember")}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

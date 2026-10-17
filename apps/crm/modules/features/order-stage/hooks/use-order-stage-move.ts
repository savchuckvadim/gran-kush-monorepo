"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { isClosedStage, toOrderStage, useMoveOrderStage } from "@/modules/entities/order";

import { stageMoveErrorKey } from "../lib/stage-move-error";
import type { StageMoveRequest } from "../model/stage-move-request";

export interface OrderStageMove {
    /** Moves at once to a working stage; asks first before closing the order */
    requestMove: (request: StageMoveRequest) => void;
    /** The closing move waiting for confirmation */
    confirming: StageMoveRequest | null;
    confirm: () => void;
    dismiss: () => void;
    isMoving: boolean;
}

/**
 * One way to move an order for the stage bar and the kanban: working stages move silently and
 * optimistically, closing ones (completed, cancelled) wait for "yes"; errors become toasts.
 */
export function useOrderStageMove(): OrderStageMove {
    const t = useTranslations("crm.orders.stage");
    const { mutate, isPending } = useMoveOrderStage();
    const [confirming, setConfirming] = useState<StageMoveRequest | null>(null);

    const run = useCallback(
        ({ order, target, afterId }: StageMoveRequest) => {
            mutate(
                { order, target: toOrderStage(target), afterId },
                {
                    onSuccess: () => {
                        if (!isClosedStage(target)) return;
                        toast.success(
                            t("closedToast", { number: order.orderNumber, stage: target.name })
                        );
                    },
                    onError: (error) => toast.error(t(stageMoveErrorKey(error))),
                }
            );
        },
        [mutate, t]
    );

    const requestMove = useCallback(
        (request: StageMoveRequest) => {
            const sameStage = request.order.stage?.id === request.target.id;
            // the same stage is a reorder on the kanban and nothing at all on the stage bar
            if (sameStage && request.afterId === undefined) return;
            if (sameStage) {
                run(request);
                return;
            }
            if (isClosedStage(request.target)) {
                setConfirming(request);
                return;
            }
            run(request);
        },
        [run]
    );

    const confirm = useCallback(() => {
        if (!confirming) return;
        run(confirming);
        setConfirming(null);
    }, [confirming, run]);

    const dismiss = useCallback(() => setConfirming(null), []);

    return { requestMove, confirming, confirm, dismiss, isMoving: isPending };
}

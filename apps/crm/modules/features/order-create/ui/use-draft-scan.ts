"use client";

import { useTranslations } from "next-intl";

import type { SchemaProductListDto } from "@workspace/api-client/core";

import { toMemberChoice } from "@/modules/entities/member";
import { type ScanHandlers, useScanHandlers } from "@/modules/shared/lib/scan";

import {
    type DraftMember,
    type DraftProduct,
    scanRefusal,
    toDraftProduct,
} from "../model/order-draft";

/**
 * Скан, пока открыт черновик заказа: код участника выбирает участника, этикетка или штрихкод
 * добавляет товар. Расходник, снятый с продажи или закончившийся товар — отказ с причиной.
 * Те же обработчики получает поле сканера-клавиатуры.
 */
export function useDraftScan({
    onMember,
    onProduct,
}: {
    onMember: (member: DraftMember) => void;
    onProduct: (product: DraftProduct) => void;
}): ScanHandlers {
    const t = useTranslations("crm.orders.create.scan");

    const handlers: ScanHandlers = {
        member: (preview) => {
            if (!preview.member) return undefined;
            const member = toMemberChoice(preview.member);
            if (!member.isActive) {
                return { ok: false, message: t("memberInactive", { name: member.name }) };
            }
            onMember(member);
            return { ok: true, message: t("memberPicked", { name: member.name }) };
        },
        product: (product: SchemaProductListDto) => {
            const refusal = scanRefusal(product);
            if (refusal) {
                return { ok: false, message: t(`refused.${refusal}`, { name: product.name }) };
            }
            onProduct(toDraftProduct(product));
            return { ok: true, message: t("added", { name: product.name }) };
        },
    };
    useScanHandlers(handlers);
    return handlers;
}

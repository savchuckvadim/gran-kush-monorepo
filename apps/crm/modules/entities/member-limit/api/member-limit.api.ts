import { assertOpenApiOk, type SchemaMonthlyLimitDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type MemberLimit = SchemaMonthlyLimitDto;

/** Лимит участника: действующий, отпущено и осталось за последние 30 дней. */
export async function getMemberLimit(memberId: string): Promise<MemberLimit> {
    const response = await $api.GET("/crm/members/{memberId}/monthly-limit", {
        params: { path: { memberId } },
    });
    return assertOpenApiOk<MemberLimit>(response);
}

/** Личный лимит участника (manager+); `null` возвращает лимит клуба. */
export async function updateMemberLimit(
    memberId: string,
    monthlyLimitGrams: number | null
): Promise<MemberLimit> {
    const response = await $api.PATCH("/crm/members/{memberId}/monthly-limit", {
        params: { path: { memberId } },
        body: { monthlyLimitGrams },
    });
    return assertOpenApiOk<MemberLimit>(response);
}

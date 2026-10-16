import { assertOpenApiOk, type SchemaQrCodeWithPayloadDto } from "@workspace/api-client/core";

import { $api, isApiErrorWithStatus } from "@/modules/shared";

/** Код участника для входа: сведения и сама строка для изображения (сотрудник печатает её). */
export type MemberQrCode = SchemaQrCodeWithPayloadDto;

/** Код участника; `null` — кода нет (ещё не выдан или отозван): это не ошибка. */
export async function getMemberQrCode(memberId: string): Promise<MemberQrCode | null> {
    try {
        const response = await $api.GET("/crm/qr-codes/member/{memberId}", {
            params: { path: { memberId } },
        });
        return await assertOpenApiOk<MemberQrCode>(response);
    } catch (error) {
        if (isApiErrorWithStatus(error, 404)) return null;
        throw error;
    }
}

/** Выпустить код или перевыпустить: прежний сразу перестаёт приниматься. */
export async function reissueMemberQrCode(memberId: string): Promise<MemberQrCode> {
    const response = await $api.POST("/crm/qr-codes/generate", { body: { memberId } });
    return assertOpenApiOk<MemberQrCode>(response);
}

/** Отозвать код: прежний не принимается, кабинет выдаст новый, когда участник его откроет. */
export async function revokeMemberQrCode(memberId: string): Promise<void> {
    const response = await $api.DELETE("/crm/qr-codes/member/{memberId}", {
        params: { path: { memberId } },
    });
    await assertOpenApiOk(response);
}

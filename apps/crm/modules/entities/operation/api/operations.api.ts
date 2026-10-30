import { assertOpenApiOk, type SchemaOperationDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type Operation = SchemaOperationDto;
export type OperationStatus = Operation["status"];

/** После этих статусов строка больше не меняется: опрос можно остановить. */
export const isOperationSettled = (status: OperationStatus): boolean =>
    status === "done" || status === "failed";

/** Моя фоновая операция: статус, результат или машинная причина сбоя. Чужую отдаёт 404. */
export const getOperation = async (id: string): Promise<Operation> =>
    assertOpenApiOk<Operation>(
        await $api.GET("/crm/operations/{id}", { params: { path: { id } } })
    );

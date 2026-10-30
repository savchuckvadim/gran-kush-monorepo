import { ApiProperty } from "@nestjs/swagger";

import {
    type JsonObject,
    type Operation,
    OPERATION_STATUSES,
    type OperationStatus,
} from "../../domain/operation";

/** Ответ 202 маршрута с `@BackgroundOperation`: id для `GET /crm/operations/:id` и для сокета. */
export class OperationAcceptedDto {
    @ApiProperty({ type: String, format: "uuid" })
    operationId!: string;
}

export class OperationDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({ type: String, example: "finance.export_books", description: "Вид операции" })
    kind!: string;

    @ApiProperty({ enum: OPERATION_STATUSES })
    status!: OperationStatus;

    @ApiProperty({
        type: "object",
        additionalProperties: true,
        nullable: true,
        description: "Результат исполнителя после `done`; файлы — ссылкой со сроком",
    })
    result!: JsonObject | null;

    @ApiProperty({
        type: String,
        nullable: true,
        example: "operation_failed",
        description:
            "Машинная причина сбоя после `failed`: код доменной ошибки или `operation_failed`",
    })
    error!: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt!: string;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    startedAt!: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    finishedAt!: string | null;
}

export const toOperationDto = (operation: Operation): OperationDto => ({
    id: operation.id,
    kind: operation.kind,
    status: operation.status,
    result: operation.result,
    error: operation.error,
    createdAt: operation.createdAt.toISOString(),
    startedAt: operation.startedAt?.toISOString() ?? null,
    finishedAt: operation.finishedAt?.toISOString() ?? null,
});

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsUUID } from "class-validator";

/** `PATCH /crm/orders/:id/stage`: в какую стадию и под какую карточку колонки. */
export class MoveOrderStageDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "Стадия из воронки заказов клуба",
    })
    @IsUUID()
    stageId: string;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description:
            "Заказ-сосед сверху в колонке канбана: карточка встаёт сразу под ним; null — наверх. Не передан: новая стадия ставит наверх, та же — без изменений",
    })
    @IsOptional()
    @IsUUID()
    afterId?: string | null;
}

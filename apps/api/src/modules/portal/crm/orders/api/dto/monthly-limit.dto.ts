import { ApiProperty } from "@nestjs/swagger";

import { IsNumber, Max, Min, ValidateIf } from "class-validator";

import { MAX_LIMIT_GRAMS } from "@modules/portal/crm/club-policy/domain/club-policy";

/** Лимит отпуска участнику за последние 30 дней: настройка и расход. */
export class MonthlyLimitDto {
    @ApiProperty({ type: Boolean, description: "Лимит у клуба включён" })
    enabled: boolean;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: "Личный лимит участника, граммы; null — действует лимит клуба",
    })
    personalGrams: number | null;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: "Действующий лимит: личный, иначе клуба; null — без лимита",
    })
    limitGrams: number | null;

    @ApiProperty({ type: Number, description: "Отпущено за последние 30 дней, граммы" })
    usedGrams: number;

    @ApiProperty({
        type: Number,
        nullable: true,
        description: "Осталось, граммы; null — без лимита",
    })
    remainingGrams: number | null;

    @ApiProperty({ type: Number, example: 30, description: "Окно лимита в днях" })
    windowDays: number;
}

export class UpdateMemberLimitDto {
    @ApiProperty({
        type: Number,
        nullable: true,
        example: 60,
        description: "Личный лимит, граммы; null — вернуть лимит клуба",
    })
    @ValidateIf((_dto, value) => value !== null)
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    @Max(MAX_LIMIT_GRAMS)
    monthlyLimitGrams: number | null;
}

import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export class FinancePeriodDto {
    @ApiProperty({ type: Number, example: 2026 })
    year!: number;

    @ApiProperty({ type: Number, example: 9 })
    month!: number;

    @ApiProperty({ type: Number })
    entryCount!: number;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    closedAt!: string | null;

    @ApiProperty({ type: String, nullable: true })
    closedByName!: string | null;

    @ApiProperty({ type: Boolean, description: "Прошедший открытый месяц — его можно закрыть" })
    closable!: boolean;
}

export class FinancePeriodParamsDto {
    @ApiProperty({ type: Number, example: 2026 })
    @Type(() => Number)
    @IsInt()
    @Min(MIN_YEAR)
    @Max(MAX_YEAR)
    year!: number;

    @ApiProperty({ type: Number, example: 9 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;
}

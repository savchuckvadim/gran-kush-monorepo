import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/** Настройка интерфейса: клубная и личная. Что с ними делать, решает клиент. */
export class UiSettingDto {
    @ApiProperty({
        example: ["total", "member", "payment"],
        type: [String],
        nullable: true,
        description: "Настройка клуба; `null` — клуб её не задавал",
    })
    portal: string[] | null;

    @ApiProperty({
        example: null,
        type: [String],
        nullable: true,
        description: "Личная настройка сотрудника поверх клубной; `null` — своей нет",
    })
    employee: string[] | null;
}

/** Сколько значений может быть в настройке: это список ключей полей, не хранилище данных. */
const MAX_VALUES = 50;

export class SaveUiSettingDto {
    @ApiPropertyOptional({
        example: ["total", "member", "payment"],
        type: [String],
        nullable: true,
        description: "Значение настройки; `null` — сбросить (личная вернётся к клубной)",
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_VALUES)
    @IsString({ each: true })
    @MaxLength(60, { each: true })
    value?: string[] | null;

    @ApiPropertyOptional({
        example: false,
        type: Boolean,
        description: "true — настройка всего клуба (manager+); иначе личная настройка",
    })
    @IsOptional()
    @IsBoolean()
    forPortal?: boolean;
}

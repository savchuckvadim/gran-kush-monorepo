import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsInt, IsOptional, IsTimeZone, Matches, Max, Min, ValidateIf } from "class-validator";

import { AUTO_EXIT_TIME, MAX_SESSION_HOURS } from "../../domain/presence-settings";

export class PresenceSettingsDto {
    @ApiProperty({
        type: String,
        example: "Europe/Madrid",
        description: "Часовой пояс клуба (IANA)",
    })
    timezone: string;

    @ApiProperty({
        type: String,
        example: "03:00",
        description: "Ежедневный авто-выход забытых визитов, HH:MM по часовому поясу клуба",
    })
    autoExitTime: string;

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 12,
        description: "Визит длиннее закрывается сам; null — без потолка",
    })
    maxSessionHours: number | null;
}

export class UpdatePresenceSettingsDto {
    @ApiPropertyOptional({ type: String, example: "Europe/Madrid" })
    @IsOptional()
    @IsTimeZone()
    timezone?: string;

    @ApiPropertyOptional({ type: String, example: "03:00" })
    @IsOptional()
    @Matches(AUTO_EXIT_TIME, { message: "autoExitTime must be HH:MM" })
    autoExitTime?: string;

    @ApiPropertyOptional({ type: Number, nullable: true, example: 12 })
    @ValidateIf((_dto, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(MAX_SESSION_HOURS.min)
    @Max(MAX_SESSION_HOURS.max)
    maxSessionHours?: number | null;
}

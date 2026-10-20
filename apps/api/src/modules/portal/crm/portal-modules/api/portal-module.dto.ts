import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean } from "class-validator";

import { PORTAL_MODULE_CODES, type PortalModuleCode } from "../domain/portal-module.catalog";

export class PortalModuleDto {
    @ApiProperty({ enum: PORTAL_MODULE_CODES, example: "finance" })
    code!: PortalModuleCode;

    @ApiProperty({ type: Boolean, description: "Модуль предусмотрен для типа портала" })
    available!: boolean;

    @ApiProperty({ type: Boolean })
    enabled!: boolean;

    @ApiProperty({ type: String, nullable: true, format: "date-time" })
    enabledAt!: string | null;
}

export class SetPortalModuleDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    enabled!: boolean;
}

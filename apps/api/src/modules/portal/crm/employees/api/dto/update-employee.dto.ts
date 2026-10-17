import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsObject, IsOptional } from "class-validator";

import { IsRoleKey } from "@modules/portal/crm/access/api/dto/role-key.decorator";

export class UpdateEmployeeDto {
    @ApiPropertyOptional({
        type: String,
        example: "manager",
        description: "Ключ роли клуба (кроме владельца)",
    })
    @IsOptional()
    @IsRoleKey()
    role?: string;

    @ApiPropertyOptional({ type: Boolean, example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        type: "object",
        additionalProperties: true,
        description: "Динамические поля профиля (fieldKey → value)",
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

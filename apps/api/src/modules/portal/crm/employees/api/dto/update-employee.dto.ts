import { ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";
import { IsBoolean, IsEnum, IsObject, IsOptional } from "class-validator";

export class UpdateEmployeeDto {
    @ApiPropertyOptional({
        enum: EmployeeRole,
        example: EmployeeRole.manager,
        description: "Employee role (cannot be portal_owner)",
    })
    @IsOptional()
    @IsEnum(EmployeeRole)
    role?: EmployeeRole;

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

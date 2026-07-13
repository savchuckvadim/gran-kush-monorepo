import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateEmployeeDto {
    @ApiPropertyOptional({ example: "manager", description: "Employee role (cannot be portal_owner)" })
    @IsOptional()
    @IsString()
    role?: string;

    @ApiPropertyOptional({ example: "Senior Manager" })
    @IsOptional()
    @IsString()
    @MinLength(1)
    position?: string;

    @ApiPropertyOptional({ example: "Sales" })
    @IsOptional()
    @IsString()
    @MinLength(1)
    department?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

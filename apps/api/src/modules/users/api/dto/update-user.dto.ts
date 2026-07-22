import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
    @ApiPropertyOptional({ type: String, example: "password123", minLength: 8 })
    @IsString()
    @IsOptional()
    @MinLength(8)
    password?: string;

    @ApiPropertyOptional({ type: Boolean, example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

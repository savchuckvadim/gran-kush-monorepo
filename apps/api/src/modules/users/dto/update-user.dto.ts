import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class UpdateUserDto {
    @ApiPropertyOptional({ example: "John Doe", minLength: 2 })
    @IsString()
    @IsOptional()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    @IsString()
    @IsOptional()
    @Matches(/^\+?[1-9]\d{1,14}$/)
    phone?: string;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

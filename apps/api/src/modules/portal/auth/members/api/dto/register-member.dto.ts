import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RegisterMemberDto {
    // User данные
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        example: "Password123",
        description: "Password must contain uppercase, lowercase and number",
        type: String,
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password: string;

    @ApiProperty({ example: "John", type: String })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    surname?: string;

    @ApiPropertyOptional({ example: "+1234567890", type: String })
    @IsString()
    @IsOptional()
    @Matches(/^\+?[1-9]\d{1,14}$/)
    phone?: string;

    @ApiPropertyOptional({ example: "2005-11-16", type: String })
    @IsDateString()
    @IsOptional()
    birthday?: string;

    @ApiPropertyOptional({ example: "ID", type: String })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    documentType?: string;

    @ApiPropertyOptional({ example: "592-9185990", type: String })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    documentNumber?: string;

    // Member данные
    @ApiPropertyOptional({ example: "123 Main St", type: String })
    @IsString()
    @IsOptional()
    address?: string;

    // Статусы употребления
    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsBoolean()
    @IsOptional()
    isMedical?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsBoolean()
    @IsOptional()
    isMj?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsBoolean()
    @IsOptional()
    isRecreation?: boolean;
}

export class RegisterQueryDto {
    @ApiPropertyOptional({ example: "true", enum: ["true", "false"], type: String })
    @IsEnum(["true", "false"])
    force: "true" | "false";
}

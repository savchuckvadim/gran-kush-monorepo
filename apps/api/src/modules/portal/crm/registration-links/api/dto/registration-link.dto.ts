import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { RegistrationLinkKind } from "@prisma/client";
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class CreateRegistrationLinkDto {
    @ApiProperty({ example: "Стойка на входе", type: String })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ enum: RegistrationLinkKind, default: RegistrationLinkKind.public_link })
    @IsOptional()
    @IsEnum(RegistrationLinkKind)
    kind?: RegistrationLinkKind;

    @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z", type: String })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional({ example: 100, type: Number })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxUses?: number;
}

export class UpdateRegistrationLinkDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z", type: String, nullable: true })
    @IsOptional()
    @IsDateString()
    expiresAt?: string | null;

    @ApiPropertyOptional({ example: 100, type: Number, nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxUses?: number | null;
}

export class RegistrationLinkDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    name: string;

    @ApiProperty({ enum: RegistrationLinkKind })
    kind: RegistrationLinkKind;

    @ApiProperty({ type: String })
    token: string;

    @ApiProperty({ type: Boolean })
    isActive: boolean;

    @ApiPropertyOptional({ type: String, nullable: true })
    expiresAt?: string | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    maxUses?: number | null;

    @ApiProperty({ type: Number })
    usesCount: number;

    @ApiProperty({ type: String })
    createdAt: string;
}

export class RegistrationLinkListResponseDto {
    @ApiProperty({ type: [RegistrationLinkDto] })
    links: RegistrationLinkDto[];
}

export class PublicRegistrationLinkInfoDto {
    @ApiProperty({ type: String, example: "green-club" })
    portalSlug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    portalDisplayName: string;

    @ApiProperty({ type: Object, description: "Схема формы public_registration портала" })
    schema: unknown;
}

export class RegisterViaLinkDto {
    @ApiProperty({ type: String, example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiPropertyOptional({
        example: "Password123",
        description: "Обязателен для нового аккаунта или клейма pending_claim",
        type: String,
    })
    @IsOptional()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password?: string;

    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

export class RegisterViaLinkResponseDto {
    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: String })
    memberId: string;

    @ApiProperty({ type: String })
    portalSlug: string;

    @ApiProperty({
        type: Boolean,
        description: "true если аккаунт создан/заклеймлен этим запросом",
    })
    accountCreated: boolean;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { RegistrationLinkKind } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";

/**
 * Статус ссылки, вычисляется на бэке из её полей:
 * ready — работает; revoked — отозвана сотрудником; disabled — выключена;
 * expired — вышел срок; exhausted — использования закончились.
 */
export enum RegistrationLinkStatus {
    ready = "ready",
    revoked = "revoked",
    disabled = "disabled",
    expired = "expired",
    exhausted = "exhausted",
}

export class RegistrationLinkPrefillDto {
    @ApiPropertyOptional({ example: "socio@example.com", type: String })
    @IsOptional()
    @IsEmailWithLowerCase()
    email?: string;

    @ApiPropertyOptional({
        type: "object",
        additionalProperties: true,
        description: "Значения полей анкеты по fieldKey",
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

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

    @ApiPropertyOptional({
        type: RegistrationLinkPrefillDto,
        description:
            "Предзаполнение анкеты. Хранится в ссылке, а не в её адресе: персональные данные не попадают в URL и логи",
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => RegistrationLinkPrefillDto)
    prefill?: RegistrationLinkPrefillDto;
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

export class RegistrationLinkListQueryDto extends PaginationDto {
    @ApiPropertyOptional({
        enum: RegistrationLinkStatus,
        description: "Только ссылки в этом статусе",
    })
    @IsOptional()
    @IsEnum(RegistrationLinkStatus)
    status?: RegistrationLinkStatus;

    @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    declare limit?: number;
}

export class RegistrationLinkCreatedByDto {
    @ApiProperty({ type: String })
    employeeId: string;

    @ApiProperty({ type: String, description: "Email сотрудника, выдавшего ссылку" })
    email: string;
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

    @ApiProperty({ enum: RegistrationLinkStatus })
    status: RegistrationLinkStatus;

    @ApiPropertyOptional({ type: String, nullable: true })
    expiresAt?: string | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    maxUses?: number | null;

    @ApiProperty({ type: Number })
    usesCount: number;

    @ApiProperty({ type: Number, description: "Сколько человек сейчас смотрят анкету по ссылке" })
    online: number;

    @ApiProperty({ type: Boolean, description: "Анкета открывается с предзаполненными полями" })
    hasPrefill: boolean;

    @ApiPropertyOptional({ type: RegistrationLinkCreatedByDto, nullable: true })
    createdBy?: RegistrationLinkCreatedByDto | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    revokedAt?: string | null;

    @ApiProperty({ type: String })
    createdAt: string;
}

export class RegistrationLinkListResponseDto {
    @ApiProperty({ type: [RegistrationLinkDto] })
    links: RegistrationLinkDto[];

    @ApiProperty({ type: Number })
    total: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    totalPages: number;
}

export class PublicRegistrationLinkInfoDto {
    @ApiProperty({ type: String, example: "green-club" })
    portalSlug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    portalDisplayName: string;

    @ApiProperty({ type: Object, description: "Схема формы public_registration портала" })
    schema: unknown;

    @ApiPropertyOptional({
        type: RegistrationLinkPrefillDto,
        nullable: true,
        description: "Значения, с которыми открывается анкета (личная ссылка)",
    })
    prefill?: RegistrationLinkPrefillDto | null;
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

export class RegistrationLinkPresenceDto {
    @ApiProperty({
        type: String,
        description: "Случайный id вкладки зрителя, живёт в sessionStorage публичной страницы",
        example: "7f3c2a9e-5b1d-4c8e-9a2f-1d3e5b7c9a0b",
    })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    @Matches(/^[A-Za-z0-9-]+$/)
    viewerId: string;
}

export class RegistrationLinkPresenceResponseDto {
    @ApiProperty({ type: Number, description: "Сколько человек сейчас смотрят анкету" })
    online: number;
}

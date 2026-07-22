import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole, InvitationStatus } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, Matches, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class CreateInvitationDto {
    @ApiProperty({ type: String, example: "new-employee@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.employee })
    @IsEnum(EmployeeRole)
    role: EmployeeRole;
}

export class InvitationDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, example: "new-employee@example.com" })
    email: string;

    @ApiProperty({ enum: EmployeeRole })
    role: EmployeeRole;

    @ApiProperty({ enum: InvitationStatus })
    status: InvitationStatus;

    @ApiProperty({ type: String, description: "Одноразовый токен для ссылки-приглашения" })
    token: string;

    @ApiProperty({ example: "2026-01-08T00:00:00.000Z", type: String })
    expiresAt: string;

    @ApiPropertyOptional({ example: "2026-01-02T00:00:00.000Z", type: String })
    acceptedAt?: string;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    createdAt: string;
}

export class InvitationListResponseDto {
    @ApiProperty({ type: [InvitationDto] })
    invitations: InvitationDto[];
}

export class PublicInvitationInfoDto {
    @ApiProperty({ type: String, example: "new-employee@example.com" })
    email: string;

    @ApiProperty({ enum: EmployeeRole })
    role: EmployeeRole;

    @ApiProperty({ type: String, example: "green-club" })
    portalSlug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    portalDisplayName: string;

    @ApiProperty({
        type: Boolean,
        description: "true если аккаунт с этим email уже существует и имеет пароль",
    })
    accountExists: boolean;
}

export class AcceptInvitationDto {
    @ApiPropertyOptional({
        example: "Password123",
        description: "Обязателен, если аккаунта ещё нет (или он pending_claim)",
        type: String,
    })
    @IsOptional()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password?: string;

    @ApiPropertyOptional({
        type: "object",
        additionalProperties: true,
        description: "Динамические поля профиля сотрудника",
        example: { first_name: "John" },
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

export class AcceptInvitationResponseDto {
    @ApiProperty({ type: String })
    employeeId: string;

    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: String })
    portalSlug: string;

    @ApiProperty({ example: "eyJhbGciOi...", type: String })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOi...", type: String })
    refreshToken: string;
}

export class RevokeInvitationResponseDto {
    @ApiProperty({ type: Boolean })
    revoked: boolean;
}

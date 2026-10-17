import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { InvitationStatus } from "@prisma/client";
import { IsObject, IsOptional, IsString, Matches, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";
import { EmployeeRoleDto } from "@modules/portal/crm/access/api/dto/portal-role.dto";
import { IsRoleKey } from "@modules/portal/crm/access/api/dto/role-key.decorator";

import {
    AcceptInvitationOutcome,
    InvitationAccountState,
} from "../../domain/invitation-acceptance";

export class CreateInvitationDto {
    @ApiProperty({ type: String, example: "new-employee@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    /** Владелец у клуба один и появляется при регистрации — приглашением его не выдать (TASK-662) */
    @ApiProperty({
        type: String,
        example: "employee",
        description: "Ключ роли клуба (кроме владельца)",
    })
    @IsRoleKey()
    role: string;
}

export class InvitationDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, example: "new-employee@example.com" })
    email: string;

    @ApiProperty({ type: () => EmployeeRoleDto })
    role: EmployeeRoleDto;

    @ApiProperty({ enum: InvitationStatus })
    status: InvitationStatus;

    @ApiProperty({ example: "2026-01-08T00:00:00.000Z", type: String })
    expiresAt: string;

    @ApiPropertyOptional({ example: "2026-01-02T00:00:00.000Z", type: String })
    acceptedAt?: string;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    createdAt: string;
}

/** Ответ на создание — единственное место, где админ видит токен (TASK-662). */
export class CreatedInvitationDto extends InvitationDto {
    @ApiProperty({
        type: String,
        description:
            "Одноразовый токен ссылки-приглашения. Ссылка уходит и письмом; в списке токена нет",
    })
    token: string;
}

export class InvitationListResponseDto {
    @ApiProperty({ type: [InvitationDto] })
    invitations: InvitationDto[];
}

export class PublicInvitationInfoDto {
    @ApiProperty({ type: String, example: "new-employee@example.com" })
    email: string;

    @ApiProperty({ type: () => EmployeeRoleDto })
    role: EmployeeRoleDto;

    @ApiProperty({ type: String, example: "green-club" })
    portalSlug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    portalDisplayName: string;

    @ApiProperty({
        enum: InvitationAccountState,
        enumName: "InvitationAccountState",
        description:
            "new — аккаунта нет (задать пароль); password — есть, принять его паролем, сессией или Google; " +
            "passwordless — есть, но без пароля: принять сессией или Google, либо задать пароль по письму",
    })
    accountState: InvitationAccountState;
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

/** Приём сессией: пароль не нужен, владелец доказан самой сессией. */
export class AcceptInvitationWithSessionDto {
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
    @ApiProperty({
        enum: AcceptInvitationOutcome,
        enumName: "AcceptInvitationOutcome",
        description:
            "accepted — сотрудник создан, сессия CRM выдана HttpOnly-куками; " +
            "accepted_pending_email — новый аккаунт и сотрудник созданы, вход после подтверждения почты; " +
            "confirm_email_first — почта аккаунта не подтверждена, письмо отправлено заново, приглашение не принято; " +
            "password_setup_sent — у аккаунта нет пароля, отправлена ссылка, чтобы его задать; приглашение не принято",
    })
    outcome: AcceptInvitationOutcome;

    @ApiProperty({ type: String })
    portalSlug: string;

    @ApiPropertyOptional({ type: String, description: "Только когда приглашение принято" })
    employeeId?: string;
}

export class RevokeInvitationResponseDto {
    @ApiProperty({ type: Boolean })
    revoked: boolean;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { UserDocumentSide } from "@prisma/client";
import { IsBoolean, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CrmMemberStatusDto {
    @ApiProperty({ type: String })
    id: string;
    @ApiProperty({ type: String })
    key: string;
    @ApiProperty({ type: String })
    label: string;
    @ApiProperty({ type: String, nullable: true })
    color: string | null;
}

export class CrmMemberDynamicFieldDto {
    @ApiProperty({ type: String })
    fieldKey: string;
    @ApiProperty({ type: String })
    type: string;
    @ApiProperty({ type: String, nullable: true })
    label: string | null;
    @ApiProperty({ type: Object })
    value: unknown;
}

export class CrmMemberDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    userId: string;
    @ApiProperty({ example: "user@example.com", type: String })
    email: string;
    /** Вычисляется из first_name */
    @ApiProperty({ example: "John", type: String })
    name: string;
    @ApiProperty({ example: "Doe", type: String, nullable: true })
    surname: string | null;
    @ApiProperty({ example: "+1234567890", type: String, nullable: true })
    phone: string | null;
    /** Ключ статуса (member_lifecycle) */
    @ApiProperty({ example: "inProgress", type: String })
    status: string;
    @ApiProperty({ type: CrmMemberStatusDto, nullable: true })
    statusItem: CrmMemberStatusDto | null;
    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;
    @ApiProperty({ example: true, type: Boolean })
    emailConfirmed: boolean;
    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String })
    createdAt: string;
}

/** Документ аккаунта (UserDocument) member'а — общий для всех клубов. */
export class CrmMemberAccountDocumentDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;
    @ApiProperty({ example: "passport", type: String })
    type: string;
    @ApiProperty({ enum: UserDocumentSide, example: UserDocumentSide.front })
    side: UserDocumentSide;
    @ApiProperty({ example: "AB1234567", type: String, nullable: true })
    number: string | null;
    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String })
    createdAt: string;
}

export class CrmMemberFullDto extends CrmMemberDto {
    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String })
    updatedAt: string;
    @ApiProperty({ type: [CrmMemberDynamicFieldDto] })
    fields: CrmMemberDynamicFieldDto[];
    @ApiProperty({ type: [CrmMemberAccountDocumentDto] })
    documents: CrmMemberAccountDocumentDto[];
    @ApiProperty({ example: true, type: Boolean })
    hasSignature: boolean;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String, nullable: true })
    birthday: string | null;
    @ApiProperty({ example: "123 Main St", type: String, nullable: true })
    address: string | null;
    @ApiProperty({ example: "1234567890", type: String, nullable: true })
    membershipNumber: string | null;
    @ApiProperty({ example: "Notes", type: String, nullable: true })
    notes: string | null;
}

/** PATCH /crm/members/:id/status — смена lifecycle-статуса. */
export class CrmMemberStatusPatchDto {
    @ApiProperty({ type: String, format: "uuid" })
    @IsUUID()
    statusItemId: string;
}

/** PATCH: только динамические поля и метаданные member. */
export class CrmMemberFieldsPatchDto {
    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    statusItemId?: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    membershipNumber?: string | null;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

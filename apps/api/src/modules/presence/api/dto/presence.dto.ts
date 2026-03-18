import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { EntryMethod, ExitMethod } from "@presence/domain/entity/presence-session.entity";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

// ═══════════════════════════════════════════════════════════════════════════════
// Вложенные DTO
// ═══════════════════════════════════════════════════════════════════════════════

export class PresenceMemberDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String, nullable: true })
    surname?: string | null;

    @ApiPropertyOptional({ example: "MBR-0042", type: String, nullable: true })
    membershipNumber?: string | null;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;
}

export class PresenceEmployeeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Admin", type: String })
    name: string;

    @ApiPropertyOptional({ example: "User", type: String, nullable: true })
    surname?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Presence Session Response
// ═══════════════════════════════════════════════════════════════════════════════

export class PresenceSessionDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    memberId: string;

    @ApiProperty({
        example: true,
        type: Boolean,
        description: "Активна ли сессия (участник в клубе)",
    })
    isActive: boolean;

    @ApiProperty({ enum: EntryMethod, example: EntryMethod.QR })
    entryMethod: string;

    @ApiPropertyOptional({ enum: ExitMethod, example: ExitMethod.QR })
    exitMethod?: string | null;

    @ApiProperty({ example: "2026-03-16T10:00:00.000Z", type: String })
    enteredAt: string;

    @ApiPropertyOptional({ example: "2026-03-16T18:00:00.000Z", type: String, nullable: true })
    exitedAt?: string | null;

    @ApiPropertyOptional({
        example: 480,
        type: Number,
        nullable: true,
        description: "Длительность визита в минутах (только для завершённых)",
    })
    durationMinutes?: number | null;

    @ApiPropertyOptional({ type: () => PresenceMemberDto })
    member?: PresenceMemberDto;

    @ApiPropertyOptional({ type: () => PresenceEmployeeDto, nullable: true })
    employee?: PresenceEmployeeDto | null;

    @ApiProperty({ example: "2026-03-16T10:00:00.000Z", type: String })
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Check-in (QR — автоматически, или Manual — сотрудником)
// ═══════════════════════════════════════════════════════════════════════════════

/** Ручной чек-ин сотрудником (через CRM) */
export class ManualCheckInDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID участника",
    })
    @IsUUID()
    @IsNotEmpty()
    memberId: string;
}

/** Ручной чек-аут сотрудником (через CRM) */
export class ManualCheckOutDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID участника",
    })
    @IsUUID()
    @IsNotEmpty()
    memberId: string;
}

/** Чек-ин через QR (encryptedCode из сканирования) */
export class QrCheckInDto {
    @ApiProperty({
        example: "a1b2c3d4e5f6...",
        type: String,
        description: "Зашифрованный payload из QR-кода",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    encryptedCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Check-in/out Result
// ═══════════════════════════════════════════════════════════════════════════════

export class CheckInResultDto {
    @ApiProperty({
        example: "entry",
        type: String,
        enum: ["entry", "exit"],
        description: "Тип действия: вход или выход",
    })
    action: "entry" | "exit";

    @ApiProperty({ type: () => PresenceSessionDto })
    session: PresenceSessionDto;

    @ApiPropertyOptional({ example: "Участник отмечен на вход", type: String })
    message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════════════════════════

export class PresenceFilterDto {
    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    memberId?: string;

    @ApiPropertyOptional({
        example: true,
        type: Boolean,
        description: "true = только присутствующие, false = только ушедшие",
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ enum: EntryMethod })
    @IsOptional()
    @IsEnum(EntryMethod)
    entryMethod?: EntryMethod;

    @ApiPropertyOptional({ example: "2026-03-01T00:00:00.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ example: "2026-03-31T23:59:59.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stats
// ═══════════════════════════════════════════════════════════════════════════════

export class PresenceStatsDto {
    @ApiProperty({ example: 12, type: Number, description: "Текущее количество присутствующих" })
    currentlyPresent: number;

    @ApiProperty({ example: 150, type: Number, description: "Всего посещений за период" })
    totalVisits: number;

    @ApiPropertyOptional({
        example: 120,
        type: Number,
        nullable: true,
        description: "Средняя длительность визита (мин)",
    })
    avgDurationMinutes?: number | null;
}

export class PresenceStatsQueryDto {
    @ApiPropertyOptional({ example: "2026-03-01T00:00:00.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ example: "2026-03-31T23:59:59.000Z", type: String })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    memberId?: string;
}

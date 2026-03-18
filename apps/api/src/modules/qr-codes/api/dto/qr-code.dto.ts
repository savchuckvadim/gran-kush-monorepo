import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

// ═══════════════════════════════════════════════════════════════════════════════
// Вложенные DTO
// ═══════════════════════════════════════════════════════════════════════════════

export class QrCodeMemberDto {
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

// ═══════════════════════════════════════════════════════════════════════════════
// QR Code Response
// ═══════════════════════════════════════════════════════════════════════════════

export class QrCodeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    memberId: string;

    @ApiProperty({ example: false, type: Boolean, description: "Истёк ли QR-код" })
    isExpired: boolean;

    @ApiProperty({ example: "2026-06-16T00:00:00.000Z", type: String })
    expiresAt: string;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    createdAt: string;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    updatedAt: string;

    @ApiPropertyOptional({ type: () => QrCodeMemberDto })
    member?: QrCodeMemberDto;
}

/**
 * QR-код с данными для генерации изображения (для LK — только свой).
 * Содержит зашифрованный payload, который нужно закодировать в QR-изображение на клиенте.
 */
export class QrCodeWithPayloadDto extends QrCodeDto {
    @ApiProperty({
        example: "a1b2c3d4e5f6...",
        type: String,
        description:
            "Зашифрованный payload — строка, которую нужно закодировать в QR-изображение на клиенте",
    })
    encryptedCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scan QR (CRM — сканирование на стойке)
// ═══════════════════════════════════════════════════════════════════════════════

export class ScanQrCodeDto {
    @ApiProperty({
        example: "a1b2c3d4e5f6...",
        type: String,
        description: "Зашифрованный payload, полученный при сканировании QR-кода",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    encryptedCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scan Result
// ═══════════════════════════════════════════════════════════════════════════════

export class QrCodeScanResultDto {
    @ApiProperty({ example: true, type: Boolean, description: "QR-код валиден" })
    valid: boolean;

    @ApiPropertyOptional({ example: "QR-код истёк", type: String, description: "Причина ошибки" })
    error?: string;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID члена клуба (если валиден)",
    })
    memberId?: string;

    @ApiPropertyOptional({ type: () => QrCodeMemberDto })
    member?: QrCodeMemberDto;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID QR-кода",
    })
    qrCodeId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Regenerate QR (для участника или CRM)
// ═══════════════════════════════════════════════════════════════════════════════

/** Перегенерировать QR-код для участника (CRM — по memberId) */
export class RegenerateQrCodeDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID члена клуба",
    })
    @IsUUID()
    @IsNotEmpty()
    memberId: string;
}

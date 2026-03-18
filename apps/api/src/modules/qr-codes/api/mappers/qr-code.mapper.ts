import { QrCodeDto, QrCodeWithPayloadDto } from "@qr-codes/api/dto/qr-code.dto";
import { QrCode } from "@qr-codes/domain/entity/qr-code.entity";

/**
 * Маппинг QrCode entity → QrCodeDto (без encryptedCode — для CRM)
 */
export function mapQrCodeToDto(qr: QrCode): QrCodeDto {
    return {
        id: qr.id,
        memberId: qr.memberId,
        isExpired: qr.isExpired(),
        expiresAt: qr.expiresAt.toISOString(),
        createdAt: qr.createdAt.toISOString(),
        updatedAt: qr.updatedAt.toISOString(),
        member: qr.member,
    };
}

/**
 * Маппинг QrCode entity → QrCodeWithPayloadDto (с encryptedCode — для LK)
 */
export function mapQrCodeToPayloadDto(qr: QrCode): QrCodeWithPayloadDto {
    return {
        ...mapQrCodeToDto(qr),
        encryptedCode: qr.encryptedCode,
    };
}

import { QrCodeDto, QrCodeWithPayloadDto } from "@modules/portal/crm/qr-codes/api/dto/qr-code.dto";
import { QrCode } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";

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
        // Только то, что нужно клиенту: статус подтверждения членства остаётся внутри API
        member: qr.member && {
            id: qr.member.id,
            portalId: qr.member.portalId,
            name: qr.member.name,
            surname: qr.member.surname,
            membershipNumber: qr.member.membershipNumber,
            isActive: qr.member.isActive,
        },
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

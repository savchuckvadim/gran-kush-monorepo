import { QrCodeDto, QrCodeWithPayloadDto } from "@modules/portal/crm/qr-codes/api/dto/qr-code.dto";
import { QrCode } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";

/** QrCode → QrCodeDto: сведения о коде без самого кода (ответы сканера и списков). */
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

/** QrCode → QrCodeWithPayloadDto: с кодом для изображения (кабинет — свой, CRM — для печати). */
export function mapQrCodeToPayloadDto(qr: QrCode, code: string): QrCodeWithPayloadDto {
    return { ...mapQrCodeToDto(qr), code };
}

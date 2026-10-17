import { QrCode } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";

export abstract class QrCodeRepository {
    /** Найти QR-код по ID */
    abstract findById(id: string): Promise<QrCode | null>;

    /** QR-код участника этого портала (у участника может быть только один QR) */
    abstract findByMemberId(memberId: string, portalId: string): Promise<QrCode | null>;

    /** Создать QR-код. Второй вызов для того же участника — нарушение уникальности. */
    abstract create(data: {
        id?: string;
        memberId: string;
        portalId: string;
        issuedAt: Date;
        expiresAt: Date;
    }): Promise<QrCode>;

    /** Перевыпуск: новый момент выпуска (а с ним и новая подпись) и срок */
    abstract update(id: string, data: { issuedAt: Date; expiresAt: Date }): Promise<QrCode>;

    /** Удалить QR-код */
    abstract delete(id: string): Promise<void>;
}

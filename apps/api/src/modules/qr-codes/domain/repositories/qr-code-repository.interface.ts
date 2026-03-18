import { QrCode } from "@qr-codes/domain/entity/qr-code.entity";

export abstract class QrCodeRepository {
    /** Найти QR-код по ID */
    abstract findById(id: string): Promise<QrCode | null>;

    /** Найти QR-код по memberId (у участника может быть только один QR) */
    abstract findByMemberId(memberId: string): Promise<QrCode | null>;

    /** Найти QR-код по зашифрованному коду */
    abstract findByEncryptedCode(encryptedCode: string): Promise<QrCode | null>;

    /** Создать QR-код */
    abstract create(data: {
        memberId: string;
        encryptedCode: string;
        expiresAt: Date;
    }): Promise<QrCode>;

    /** Обновить QR-код (перегенерация) */
    abstract update(
        id: string,
        data: {
            encryptedCode: string;
            expiresAt: Date;
        }
    ): Promise<QrCode>;

    /** Удалить QR-код */
    abstract delete(id: string): Promise<void>;

    /** Удалить QR-код по memberId */
    abstract deleteByMemberId(memberId: string): Promise<void>;

    /** Найти все истёкшие QR-коды */
    abstract findExpired(): Promise<QrCode[]>;
}

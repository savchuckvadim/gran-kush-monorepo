/**
 * Domain Entity — QrCode (QR-код члена клуба)
 *
 * QR-код содержит зашифрованный payload с данными участника.
 * Используется для:
 * - Входа/выхода из клуба (сканирование на стойке)
 * - Идентификации при заказе
 */
export class QrCode {
    id: string;
    memberId: string;

    /** Зашифрованный payload (AES-256-GCM) */
    encryptedCode: string;

    /** Срок действия QR-кода */
    expiresAt: Date;

    createdAt: Date;
    updatedAt: Date;

    // Relations (опционально)
    member?: {
        id: string;
        name: string;
        surname?: string | null;
        membershipNumber?: string | null;
        isActive: boolean;
    };

    constructor(partial: Partial<QrCode>) {
        Object.assign(this, partial);
    }

    /** Проверить, не истёк ли срок действия */
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }
}

/**
 * Расшифрованный payload QR-кода.
 * Содержится внутри encryptedCode после дешифрования.
 */
export interface QrCodePayload {
    /** ID члена клуба */
    memberId: string;
    /** ID самого QR-кода */
    qrCodeId: string;
    /** Время создания (ISO) */
    issuedAt: string;
    /** Время истечения (ISO) */
    expiresAt: string;
}

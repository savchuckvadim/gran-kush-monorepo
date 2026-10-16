import type { MemberConsentStatus } from "@prisma/client";

/**
 * QR-код участника для входа в клуб. Сама строка кода здесь не хранится: её считает
 * `QrCodesService` из `id` и `issuedAt` (см. описание сервиса).
 */
export class QrCode {
    id: string;
    memberId: string;

    /** Момент выпуска: входит в подпись кода, поэтому перевыпуск гасит прежний код */
    issuedAt: Date;

    /** Срок действия QR-кода */
    expiresAt: Date;

    createdAt: Date;
    updatedAt: Date;

    member?: {
        id: string;
        portalId: string;
        name: string;
        surname?: string | null;
        membershipNumber?: string | null;
        isActive: boolean;
        consentStatus: MemberConsentStatus;
    };

    constructor(partial: Partial<QrCode>) {
        Object.assign(this, partial);
    }

    /** Проверить, не истёк ли срок действия */
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }
}

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EncryptionService } from "@encryption/application/services/encryption.service";
import { MembersService } from "@members/application/services/members.service";
import { QrCode, QrCodePayload } from "@qr-codes/domain/entity/qr-code.entity";
import { QrCodeRepository } from "@qr-codes/domain/repositories/qr-code-repository.interface";

@Injectable()
export class QrCodesService {
    private readonly logger = new Logger(QrCodesService.name);

    /** Срок действия QR-кода в днях (по умолчанию 90) */
    private readonly qrCodeExpirationDays: number;

    constructor(
        private readonly qrCodeRepository: QrCodeRepository,
        private readonly encryptionService: EncryptionService,
        private readonly membersService: MembersService,
        private readonly configService: ConfigService
    ) {
        this.qrCodeExpirationDays = parseInt(
            this.configService.get<string>("QR_CODE_EXPIRATION_DAYS") ?? "90",
            10
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /** Получить QR-код участника */
    async findByMemberId(memberId: string): Promise<QrCode | null> {
        return this.qrCodeRepository.findByMemberId(memberId);
    }

    /** Получить QR-код по ID */
    async findById(id: string): Promise<QrCode | null> {
        return this.qrCodeRepository.findById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Generate / Regenerate
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Создать или перегенерировать QR-код для участника.
     * - Проверяет, что участник существует и активен
     * - Шифрует payload (memberId, qrCodeId, issuedAt, expiresAt) с помощью AES-256-GCM
     * - Если у участника уже есть QR-код — обновляет его
     */
    async generateOrRegenerate(memberId: string): Promise<QrCode> {
        // Проверяем участника
        const member = await this.membersService.findById(memberId);
        if (!member) {
            throw new NotFoundException(`Участник с ID "${memberId}" не найден`);
        }
        if (!member.isActive) {
            throw new BadRequestException(
                `Участник "${member.name}" не активен. QR-код может быть выдан только активным участникам.`
            );
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + this.qrCodeExpirationDays);

        // Проверяем, есть ли уже QR-код
        const existing = await this.qrCodeRepository.findByMemberId(memberId);

        if (existing) {
            // Перегенерация: обновляем payload и срок действия
            const payload: QrCodePayload = {
                memberId,
                qrCodeId: existing.id,
                issuedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            };

            const encryptedCode = this.encryptionService.encrypt(JSON.stringify(payload));

            const updated = await this.qrCodeRepository.update(existing.id, {
                encryptedCode,
                expiresAt,
            });

            this.logger.log(
                `🔄 QR-код перегенерирован для участника ${memberId} (истекает: ${expiresAt.toISOString()})`
            );

            return updated;
        }

        // Создание нового: сначала создаём запись, потом шифруем с qrCodeId
        const tempQr = await this.qrCodeRepository.create({
            memberId,
            encryptedCode: "temp", // Временное значение
            expiresAt,
        });

        const payload: QrCodePayload = {
            memberId,
            qrCodeId: tempQr.id,
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
        };

        const encryptedCode = this.encryptionService.encrypt(JSON.stringify(payload));

        const finalQr = await this.qrCodeRepository.update(tempQr.id, {
            encryptedCode,
            expiresAt,
        });

        this.logger.log(
            `✅ QR-код создан для участника ${memberId} (истекает: ${expiresAt.toISOString()})`
        );

        return finalQr;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Scan / Validate
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Валидация отсканированного QR-кода.
     * - Расшифровывает payload
     * - Проверяет срок действия
     * - Проверяет, что QR-код существует в БД
     * - Проверяет, что участник активен
     *
     * @returns Объект с результатом сканирования
     */
    async validateScannedCode(encryptedCode: string): Promise<{
        valid: boolean;
        error?: string;
        memberId?: string;
        qrCodeId?: string;
        member?: QrCode["member"];
    }> {
        // 1. Расшифровка
        let payload: QrCodePayload;
        try {
            const decrypted = this.encryptionService.decrypt(encryptedCode);
            payload = JSON.parse(decrypted) as QrCodePayload;
        } catch {
            return {
                valid: false,
                error: "Невалидный QR-код: не удалось расшифровать",
            };
        }

        // 2. Проверка полей
        if (!payload.memberId || !payload.qrCodeId || !payload.expiresAt) {
            return {
                valid: false,
                error: "Невалидный QR-код: отсутствуют обязательные поля",
            };
        }

        // 3. Проверка срока действия (из payload)
        if (new Date(payload.expiresAt) < new Date()) {
            return {
                valid: false,
                error: "QR-код истёк. Необходимо перегенерировать.",
                memberId: payload.memberId,
                qrCodeId: payload.qrCodeId,
            };
        }

        // 4. Проверка в БД
        const qrCode = await this.qrCodeRepository.findById(payload.qrCodeId);
        if (!qrCode) {
            return {
                valid: false,
                error: "QR-код не найден в базе данных. Возможно, был отозван.",
            };
        }

        // 5. Проверка соответствия memberId
        if (qrCode.memberId !== payload.memberId) {
            return {
                valid: false,
                error: "QR-код не соответствует участнику",
            };
        }

        // 6. Проверка срока действия (из БД)
        if (qrCode.isExpired()) {
            return {
                valid: false,
                error: "QR-код истёк (по данным из БД)",
                memberId: qrCode.memberId,
                qrCodeId: qrCode.id,
            };
        }

        // 7. Проверка, что участник активен
        if (qrCode.member && !qrCode.member.isActive) {
            return {
                valid: false,
                error: "Участник не активен",
                memberId: qrCode.memberId,
                qrCodeId: qrCode.id,
                member: qrCode.member,
            };
        }

        return {
            valid: true,
            memberId: qrCode.memberId,
            qrCodeId: qrCode.id,
            member: qrCode.member,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Delete / Revoke
    // ═══════════════════════════════════════════════════════════════════════════

    /** Удалить (отозвать) QR-код участника */
    async revokeByMemberId(memberId: string): Promise<void> {
        const existing = await this.qrCodeRepository.findByMemberId(memberId);
        if (!existing) {
            throw new NotFoundException(`QR-код для участника "${memberId}" не найден`);
        }
        await this.qrCodeRepository.delete(existing.id);
        this.logger.log(`🗑️ QR-код отозван для участника ${memberId}`);
    }
}

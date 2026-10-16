import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EncryptionService } from "@encryption/application/services/encryption.service";
import { MemberConsentStatus } from "@prisma/client";
import { timingSafeEqual } from "crypto";

import { DEFAULT_CONTENT_LOCALE } from "@common/i18n";
import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { QrCode } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";
import {
    QR_SCAN_ERROR_MESSAGES,
    QrScanErrorCode,
} from "@modules/portal/crm/qr-codes/domain/qr-scan-error";
import { formatQrToken, parseQrToken } from "@modules/portal/crm/qr-codes/domain/qr-token";
import { QrCodeRepository } from "@modules/portal/crm/qr-codes/domain/repositories/qr-code-repository.interface";

export interface QrScanValidation {
    valid: boolean;
    /** Причина отказа — клиент переводит её на язык интерфейса. */
    errorCode?: QrScanErrorCode;
    /** Та же причина английским текстом: для логов и клиентов без переводов. */
    error?: string;
    memberId?: string;
    qrCodeId?: string;
    member?: QrCode["member"];
}

/** Цель ключа подписи кода входа; смена версии гасит все выданные коды. */
const QR_TOKEN_PURPOSE = "qr-entry-token/v1";

/**
 * QR-код участника — как он устроен и почему так.
 *
 * ЗАЧЕМ. Участник показывает QR на стойке клуба, сотрудник сканирует: так фиксируются вход
 * и выход. QR ни во что не вмешивается сам по себе: он лишь называет участника. Что делать
 * дальше (пустить, закрыть визит), решает сервер по состоянию участника.
 *
 * ЧТО ВНУТРИ. Строка кода — 38 знаков (`domain/qr-token.ts`): id записи кода и подпись сервера
 * к нему, HMAC от `id:issuedAt` ключом, выведенным из мастер-ключа только для этой цели. Короткая
 * строка даёт редкий QR, который читается с первого раза.
 *
 * ЧТО ДЕЛАЕТ КОД ДЕЙСТВИТЕЛЬНЫМ. Подпись должна совпасть с той, что сервер считает по записи в
 * БД прямо сейчас. Секрета в БД нет совсем — ни кода, ни его хеша: из БД код не прочитать, а без
 * ключа сервера его не собрать. Из этого следует:
 *   - перевыпуск (новый `issuedAt`) мгновенно гасит прежний код: его подпись больше не сходится;
 *   - отзыв (удаление записи) гасит код;
 *   - утечка БД без ключа ничего не даёт; утечка ключа лечится сменой ключа, после неё все коды
 *     перевыпускаются сами при следующем открытии кабинета.
 *
 * ОБЛАСТЬ ДЕЙСТВИЯ. Один код на членство (то есть на пару «аккаунт — клуб»), а не на аккаунт:
 * участник нескольких клубов получает отдельный код в каждом. Сканер клуба принимает только
 * коды своего клуба (`wrong_club`), поэтому код одного клуба бесполезен в другом.
 *
 * СРОК. Код статичный и живёт `QR_CODE_EXPIRATION_DAYS` дней (по умолчанию 90). Ротируемый
 * каждую минуту код надёжнее от пересылки скриншота, но требует открытого кабинета у двери;
 * для клуба с очередью это хуже. От скриншота защищает другое: сотрудник на предпросмотре видит
 * имя и номер участника и подтверждает вход глазами, а перевыпуск гасит утёкший код.
 * Просроченный или отсутствующий код участник получает сам, открыв кабинет (`ensureCurrent`).
 *
 * КОМУ МОЖНО. Код выдаётся только активному участнику, подтвердившему членство
 * (`consentStatus = confirmed`): клуб, который лишь вписал чужой email, не может стать
 * местом, где этот человек «отмечается» (TASK-703).
 */
@Injectable()
export class QrCodesService {
    private readonly logger = new Logger(QrCodesService.name);

    /** Срок действия QR-кода в днях (по умолчанию 90) */
    private readonly qrCodeExpirationDays: number;

    constructor(
        private readonly qrCodeRepository: QrCodeRepository,
        private readonly encryption: EncryptionService,
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

    /** Получить QR-код участника (в пределах портала) */
    async findByMemberId(memberId: string, portalId: string): Promise<QrCode | null> {
        const member = await this.membersService.findByIdForPortal(memberId, portalId);
        if (!member) {
            return null;
        }
        return this.qrCodeRepository.findByMemberId(memberId);
    }

    /** Получить QR-код по ID */
    async findById(id: string): Promise<QrCode | null> {
        return this.qrCodeRepository.findById(id);
    }

    /** Строка для QR-изображения: считается заново, в БД её нет. */
    codeOf(qr: QrCode): string {
        return formatQrToken(qr.id, this.signatureOf(qr.id, qr.issuedAt));
    }

    /**
     * Действующий код участника: выдаёт, если кода ещё нет, и продлевает, если срок вышел.
     * Так новому участнику не нужно просить администратора «сделать QR», а старому не нужно
     * знать, что срок кончился. Просто открыл кабинет — получил рабочий код.
     */
    async ensureCurrent(memberId: string, portalId: string): Promise<QrCode> {
        const existing = await this.findByMemberId(memberId, portalId);
        if (existing && !existing.isExpired()) {
            return existing;
        }
        return this.generateOrRegenerate(memberId, portalId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Generate / Regenerate
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Создать или перевыпустить QR-код участника.
     * Перевыпуск ВСЕГДА гасит прежний код: новый момент выпуска меняет подпись (см. описание класса).
     */
    async generateOrRegenerate(memberId: string, portalId: string): Promise<QrCode> {
        const member = await this.membersService.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException(`Member "${memberId}" not found`);
        }
        if (!member.isActive) {
            const label =
                this.membersService.toCrmMemberListDto(member, DEFAULT_CONTENT_LOCALE).name ||
                member.id;
            throw new BadRequestException(
                `Member "${label}" is not active. A QR code can only be issued to an active member.`
            );
        }
        if (member.consentStatus !== MemberConsentStatus.confirmed) {
            throw new BadRequestException(QR_SCAN_ERROR_MESSAGES.membership_unconfirmed);
        }

        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt);
        expiresAt.setDate(expiresAt.getDate() + this.qrCodeExpirationDays);

        const existing = await this.qrCodeRepository.findByMemberId(memberId);
        if (existing) {
            return this.reissue(existing, issuedAt, expiresAt);
        }

        try {
            const created = await this.qrCodeRepository.create({ memberId, issuedAt, expiresAt });
            this.logger.log(
                `QR code issued for member ${memberId}, expires ${expiresAt.toISOString()}`
            );
            return created;
        } catch (error: unknown) {
            // Два запроса одновременно выдавали первый код: выиграл один, второй не должен падать
            // 500-й, а просто перевыпускает уже созданный.
            if (!isUniqueViolationOn(error, "entity_record_id")) {
                throw error;
            }
            const winner = await this.qrCodeRepository.findByMemberId(memberId);
            if (!winner) {
                throw error;
            }
            return this.reissue(winner, issuedAt, expiresAt);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Scan / Validate
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Проверить отсканированный код. Ничего не пишет: решение «вход или выход» принимает
     * вызывающий (`PresenceService`) по результату и состоянию участника.
     *
     * Порядок проверок важен: сначала форма строки (без БД), потом подпись, и только подписанный
     * код говорит о клубе, сроке и участнике. Каждый отказ возвращает код (`errorCode`), по которому клиент
     * показывает понятную причину: «истёк» говорит участнику открыть кабинет, «перевыпущен» —
     * что у него в телефоне старая картинка.
     */
    async validateScannedCode(code: string, portalId: string): Promise<QrScanValidation> {
        // 1. Форма строки: чужой QR или обрывок снимка отсекается без обращения к БД.
        const parts = parseQrToken(code.trim());
        if (!parts) {
            return this.reject("malformed");
        }

        // 2. Запись кода есть: иначе код отозван (запись удалена).
        const qrCode = await this.qrCodeRepository.findById(parts.qrCodeId);
        if (!qrCode) {
            return this.reject("revoked");
        }

        // 3. Подпись сходится с текущим выпуском. Это и есть гашение при перевыпуске: у прежнего
        // кода подпись от прежнего `issuedAt`. До этой проверки код ничего не говорит о клубе.
        if (!this.sameSignature(parts.signature, this.signatureOf(qrCode.id, qrCode.issuedAt))) {
            return this.reject("revoked", qrCode.memberId, qrCode.id);
        }

        // 4. Участник принадлежит клубу сканирующего сотрудника.
        if (!qrCode.member || qrCode.member.portalId !== portalId) {
            return this.reject("wrong_club");
        }

        // 5. Срок действия.
        if (qrCode.isExpired()) {
            return this.reject("expired", qrCode.memberId, qrCode.id);
        }

        // 6. Участник не отключён клубом.
        if (!qrCode.member.isActive) {
            return this.reject("member_inactive", qrCode.memberId, qrCode.id, qrCode.member);
        }

        // 7. Участник сам подтвердил членство. Код не должен работать у клуба, который лишь
        // вписал чужой email и ждёт согласия владельца аккаунта.
        if (qrCode.member.consentStatus !== MemberConsentStatus.confirmed) {
            return this.reject("membership_unconfirmed", qrCode.memberId, qrCode.id);
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

    /** Отозвать QR-код участника (в пределах портала): после этого прежний код не принимается. */
    async revokeByMemberId(memberId: string, portalId: string): Promise<void> {
        const member = await this.membersService.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException(`QR code for member "${memberId}" not found`);
        }
        const existing = await this.qrCodeRepository.findByMemberId(memberId);
        if (!existing) {
            throw new NotFoundException(`QR code for member "${memberId}" not found`);
        }
        await this.qrCodeRepository.delete(existing.id);
        this.logger.log(`QR code revoked for member ${memberId}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Internals
    // ═══════════════════════════════════════════════════════════════════════════

    /** Новый момент выпуска у существующей записи: прежний код при этом перестаёт приниматься. */
    private async reissue(existing: QrCode, issuedAt: Date, expiresAt: Date): Promise<QrCode> {
        // перевыпуск в ту же миллисекунду дал бы ту же подпись, и прежний код не погас бы
        const at =
            issuedAt > existing.issuedAt ? issuedAt : new Date(existing.issuedAt.getTime() + 1);
        const updated = await this.qrCodeRepository.update(existing.id, {
            issuedAt: at,
            expiresAt,
        });
        this.logger.log(
            `QR code reissued for member ${existing.memberId}, expires ${expiresAt.toISOString()}`
        );
        return updated;
    }

    private signatureOf(qrCodeId: string, issuedAt: Date): Buffer {
        return this.encryption.sign(QR_TOKEN_PURPOSE, `${qrCodeId}:${issuedAt.toISOString()}`);
    }

    /** Сравнение подписи за постоянное время: по времени ответа её нельзя подбирать побайтово. */
    private sameSignature(submitted: Buffer, expected: Buffer): boolean {
        const right = expected.subarray(0, submitted.length);
        return (
            submitted.length > 0 &&
            right.length === submitted.length &&
            timingSafeEqual(submitted, right)
        );
    }

    private reject(
        code: QrScanErrorCode,
        memberId?: string,
        qrCodeId?: string,
        member?: QrCode["member"]
    ): QrScanValidation {
        return {
            valid: false,
            errorCode: code,
            error: QR_SCAN_ERROR_MESSAGES[code],
            memberId,
            qrCodeId,
            member,
        };
    }
}

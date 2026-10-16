import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EncryptionService } from "@encryption/application/services/encryption.service";
import { MemberConsentStatus } from "@prisma/client";
import { randomUUID, timingSafeEqual } from "crypto";

import { DEFAULT_CONTENT_LOCALE } from "@common/i18n";
import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { QrCode, QrCodePayload } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";
import {
    QR_SCAN_ERROR_MESSAGES,
    QrScanErrorCode,
} from "@modules/portal/crm/qr-codes/domain/qr-scan-error";
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

/**
 * QR-код участника — как он устроен и почему так.
 *
 * ЗАЧЕМ. Участник показывает QR на стойке клуба, сотрудник сканирует: так фиксируются вход
 * и выход. QR ни во что не вмешивается сам по себе: он лишь называет участника. Что делать
 * дальше (пустить, закрыть визит), решает сервер по состоянию участника.
 *
 * ЧТО ВНУТРИ. Строка `encryptedCode` — зашифрованный AES-256-GCM payload
 * `{ memberId, qrCodeId, issuedAt, expiresAt }`. Шифрование здесь нужно не для секретности
 * (сканер всё равно получает строку целиком), а чтобы нельзя было собрать код руками, не зная
 * ключа сервера: GCM ещё и проверяет целостность.
 *
 * ЧТО ДЕЛАЕТ КОД ДЕЙСТВИТЕЛЬНЫМ. Одной расшифровки мало, иначе код жил бы до срока, даже
 * если его перевыпустили, а ключ сервера давал бы возможность подделывать коды. Поэтому
 * сервер дополнительно требует, чтобы присланная строка ПОБАЙТОВО совпала с той, что лежит
 * в БД у участника (`qr_codes.encrypted_code`). Из этого следует:
 *   - перевыпуск (смена строки в БД) мгновенно гасит прежний код: шифртекст каждый раз новый,
 *     потому что у AES-GCM случайный IV, а `issuedAt` меняется;
 *   - отзыв (удаление строки) гасит код;
 *   - подделка без доступа на запись в БД невозможна, даже при утёкшем ключе шифрования.
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
 *
 * КУДА РАЗВИВАТЬ (TASK-714, QR v2). Вместо шифртекста в ~420 символов — короткий случайный
 * токен (в БД только его хеш): QR получается редким и читается с первого раза, а доверие к
 * ключу шифрования пропадает совсем. Поведение для клиентов от этого не меняется.
 */
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
     * Перевыпуск ВСЕГДА гасит прежний код: строка в БД заменяется, а сервер принимает только
     * строку, совпадающую с БД (см. описание класса).
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

        // id задаём сами: он входит в зашифрованный payload, поэтому строку делаем ДО вставки и
        // пишем одним INSERT. Раньше сначала создавалась строка с кодом «temp» и тут же
        // обновлялась: параллельный запрос успевал увидеть «temp» или упасть на уникальном ключе.
        const id = randomUUID();
        try {
            const created = await this.qrCodeRepository.create({
                id,
                memberId,
                encryptedCode: this.seal({ memberId, qrCodeId: id, issuedAt, expiresAt }),
                expiresAt,
            });
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
     * Порядок проверок важен: сначала дешёвые и безопасные (без обращения к БД), и только
     * потом всё, что требует БД. Каждый отказ возвращает код (`errorCode`), по которому клиент
     * показывает понятную причину: «истёк» говорит участнику открыть кабинет, «перевыпущен» —
     * что у него в телефоне старая картинка.
     */
    async validateScannedCode(encryptedCode: string, portalId: string): Promise<QrScanValidation> {
        // 1. Расшифровка: чужая или испорченная строка не расшифруется (GCM проверяет тег).
        let payload: QrCodePayload;
        try {
            payload = JSON.parse(this.encryptionService.decrypt(encryptedCode)) as QrCodePayload;
        } catch {
            return this.reject("undecryptable");
        }

        // 2. В payload есть всё, что нужно дальше.
        if (!payload.memberId || !payload.qrCodeId || !payload.expiresAt) {
            return this.reject("malformed");
        }

        // 3. Срок из самого payload. Проверка раньше БД: просроченный код не стоит запроса.
        if (new Date(payload.expiresAt) < new Date()) {
            return this.reject("expired", payload.memberId, payload.qrCodeId);
        }

        // 4. Строка в БД есть: иначе код отозван (запись удалена).
        const qrCode = await this.qrCodeRepository.findById(payload.qrCodeId);
        if (!qrCode) {
            return this.reject("revoked");
        }

        // 5. Присланная строка — именно ТЕКУЩАЯ у участника. Это и есть гашение при перевыпуске:
        // расшифровать можно и прежний код, но в БД уже лежит другая строка.
        if (!this.sameCode(encryptedCode, qrCode.encryptedCode)) {
            return this.reject("revoked", qrCode.memberId, qrCode.id);
        }

        // 6. Payload и БД говорят об одном участнике.
        if (qrCode.memberId !== payload.memberId) {
            return this.reject("wrong_member");
        }

        // 7. Участник принадлежит клубу сканирующего сотрудника.
        if (!qrCode.member || qrCode.member.portalId !== portalId) {
            return this.reject("wrong_club");
        }

        // 8. Срок по БД (его могли сократить или продлить уже после выпуска).
        if (qrCode.isExpired()) {
            return this.reject("expired", qrCode.memberId, qrCode.id);
        }

        // 9. Участник не отключён клубом.
        if (!qrCode.member.isActive) {
            return this.reject("member_inactive", qrCode.memberId, qrCode.id, qrCode.member);
        }

        // 10. Участник сам подтвердил членство. Код не должен работать у клуба, который лишь
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

    /** Заменить строку у существующей записи: прежний код при этом перестаёт приниматься. */
    private async reissue(existing: QrCode, issuedAt: Date, expiresAt: Date): Promise<QrCode> {
        const updated = await this.qrCodeRepository.update(existing.id, {
            encryptedCode: this.seal({
                memberId: existing.memberId,
                qrCodeId: existing.id,
                issuedAt,
                expiresAt,
            }),
            expiresAt,
        });
        this.logger.log(
            `QR code reissued for member ${existing.memberId}, expires ${expiresAt.toISOString()}`
        );
        return updated;
    }

    private seal(input: {
        memberId: string;
        qrCodeId: string;
        issuedAt: Date;
        expiresAt: Date;
    }): string {
        const payload: QrCodePayload = {
            memberId: input.memberId,
            qrCodeId: input.qrCodeId,
            issuedAt: input.issuedAt.toISOString(),
            expiresAt: input.expiresAt.toISOString(),
        };
        return this.encryptionService.encrypt(JSON.stringify(payload));
    }

    /**
     * Сравнение строк кода за постоянное время: по времени ответа нельзя подбирать код
     * посимвольно. Разная длина — сразу «не совпало» (длина строки не секрет).
     */
    private sameCode(submitted: string, stored: string): boolean {
        const left = Buffer.from(submitted);
        const right = Buffer.from(stored);
        return left.length === right.length && timingSafeEqual(left, right);
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

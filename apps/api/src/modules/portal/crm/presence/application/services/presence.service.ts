import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import {
    EntryMethod,
    ExitMethod,
    PresenceSession,
} from "@modules/portal/crm/presence/domain/entity/presence-session.entity";
import {
    PresenceFilters,
    PresenceSessionRepository,
    PresenceStats,
} from "@modules/portal/crm/presence/domain/repositories/presence-session-repository.interface";
import { QrCodesService } from "@modules/portal/crm/qr-codes/application/services/qr-codes.service";

@Injectable()
export class PresenceService {
    private readonly logger = new Logger(PresenceService.name);

    constructor(
        private readonly sessionRepository: PresenceSessionRepository,
        private readonly qrCodesService: QrCodesService,
        private readonly membersService: MembersService
    ) {}

    // ═══════════════════════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════════════════════

    async findById(id: string, portalId?: string): Promise<PresenceSession | null> {
        return this.sessionRepository.findById(id, portalId);
    }

    async findActiveByMemberId(
        memberId: string,
        portalId?: string
    ): Promise<PresenceSession | null> {
        return this.sessionRepository.findActiveByMemberId(memberId, portalId);
    }

    async findAll(
        filters?: PresenceFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<PresenceSession[]> {
        return this.sessionRepository.findAll(filters, limit, skip, sortBy, sortOrder);
    }

    async count(filters?: PresenceFilters): Promise<number> {
        return this.sessionRepository.count(filters);
    }

    async countCurrentlyPresent(portalId?: string): Promise<number> {
        return this.sessionRepository.countCurrentlyPresent(portalId);
    }

    async getStats(
        startDate?: Date,
        endDate?: Date,
        memberId?: string,
        portalId?: string
    ): Promise<PresenceStats> {
        return this.sessionRepository.getStats(startDate, endDate, memberId, portalId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QR Check-in / Check-out (Toggle)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Сканирование QR-кода на стойке.
     * Если участник не в клубе → check-in (вход).
     * Если участник в клубе → check-out (выход).
     */
    async handleQrScan(
        encryptedCode: string,
        portalId: string
    ): Promise<{
        action: "entry" | "exit";
        session: PresenceSession;
    }> {
        // 1. Валидируем QR-код
        const scanResult = await this.qrCodesService.validateScannedCode(encryptedCode);

        if (!scanResult.valid) {
            throw new BadRequestException(scanResult.error ?? "Невалидный QR-код");
        }

        const memberId = scanResult.memberId!;

        // 2. Проверяем, есть ли активная сессия (участник должен принадлежать порталу)
        const activeSession = await this.sessionRepository.findActiveByMemberId(
            memberId,
            portalId
        );

        if (activeSession) {
            // Выход
            const session = await this.sessionRepository.closeSession(activeSession.id, {
                exitMethod: ExitMethod.QR,
            });

            this.logger.log(
                `🚪 Выход (QR): участник ${memberId}, ` +
                    `был в клубе ${session.getDurationMinutes() ?? "?"} мин`
            );

            return { action: "exit", session };
        }

        // Вход
        const session = await this.sessionRepository.createEntry({
            memberId,
            entryMethod: EntryMethod.QR,
            portalId,
        });

        this.logger.log(`🚪 Вход (QR): участник ${memberId}`);

        return { action: "entry", session };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Manual Check-in (Employee)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Ручной чек-ин сотрудником CRM.
     */
    async manualCheckIn(
        memberId: string,
        employeeId: string,
        portalId: string
    ): Promise<PresenceSession> {
        // Проверяем участника (в рамках портала)
        const member = await this.membersService.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException(`Участник "${memberId}" не найден`);
        }
        if (!member.isActive) {
            throw new BadRequestException(`Участник не активен`);
        }

        // Проверяем, нет ли уже активной сессии
        const existing = await this.sessionRepository.findActiveByMemberId(memberId, portalId);
        if (existing) {
            throw new BadRequestException(`Участник уже отмечен на вход (сессия ${existing.id})`);
        }

        const session = await this.sessionRepository.createEntry({
            memberId,
            employeeId,
            entryMethod: EntryMethod.MANUAL_EMPLOYEE,
            portalId,
        });

        this.logger.log(`🚪 Вход (ручной): участник ${memberId}, сотрудник ${employeeId}`);

        return session;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Manual Check-out (Employee)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Ручной чек-аут сотрудником CRM.
     */
    async manualCheckOut(
        memberId: string,
        employeeId: string,
        portalId: string
    ): Promise<PresenceSession> {
        const activeSession = await this.sessionRepository.findActiveByMemberId(
            memberId,
            portalId
        );

        if (!activeSession) {
            throw new BadRequestException(
                `У участника "${memberId}" нет активной сессии присутствия`
            );
        }

        const session = await this.sessionRepository.closeSession(activeSession.id, {
            exitMethod: ExitMethod.MANUAL_EMPLOYEE,
            employeeId,
        });

        this.logger.log(
            `🚪 Выход (ручной): участник ${memberId}, сотрудник ${employeeId}, ` +
                `длительность ${session.getDurationMinutes() ?? "?"} мин`
        );

        return session;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Auto-close (Cron)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Автоматическое закрытие всех активных сессий (вызывается cron-задачей).
     * Используется для закрытия «забытых» сессий в конце дня.
     */
    async autoCloseAllSessions(): Promise<number> {
        const activeSessions = await this.sessionRepository.findAllActive();

        if (activeSessions.length === 0) {
            this.logger.log("⏰ Auto-close: нет активных сессий для закрытия");
            return 0;
        }

        const ids = activeSessions.map((s) => s.id);
        const count = await this.sessionRepository.closeMany(ids, ExitMethod.AUTO_CRON);

        this.logger.log(`⏰ Auto-close: закрыто ${count} сессий (cron)`);

        return count;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QR Preview (read-only — без записи, только информация)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Предпросмотр QR-кода на стойке.
     * Валидирует QR, проверяет текущее присутствие и возвращает
     * информацию о действии (вход/выход) — без записи в БД.
     */
    async previewQrScan(
        encryptedCode: string,
        portalId: string
    ): Promise<{
        valid: boolean;
        error?: string;
        member?: {
            id: string;
            name: string;
            surname?: string | null;
            membershipNumber?: string | null;
            isActive: boolean;
        };
        isPresent: boolean;
        proposedAction: "entry" | "exit";
    }> {
        // 1. Валидируем QR
        const scanResult = await this.qrCodesService.validateScannedCode(encryptedCode);

        if (!scanResult.valid) {
            return {
                valid: false,
                error: scanResult.error,
                isPresent: false,
                proposedAction: "entry",
            };
        }

        const memberId = scanResult.memberId!;

        // 2. Проверяем текущую активную сессию (без создания), участник должен принадлежать порталу
        let activeSession: PresenceSession | null;
        try {
            activeSession = await this.sessionRepository.findActiveByMemberId(memberId, portalId);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return {
                    valid: false,
                    error: "Участник не найден",
                    isPresent: false,
                    proposedAction: "entry",
                };
            }
            throw error;
        }

        return {
            valid: true,
            member: scanResult.member,
            isPresent: activeSession !== null,
            proposedAction: activeSession ? "exit" : "entry",
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Check if Member is Present (for other modules)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Проверить, присутствует ли участник в клубе.
     * Используется в PresenceGuard и при создании заказа.
     */
    async isMemberPresent(memberId: string, portalId?: string): Promise<boolean> {
        const session = await this.sessionRepository.findActiveByMemberId(memberId, portalId);
        return session !== null;
    }
}

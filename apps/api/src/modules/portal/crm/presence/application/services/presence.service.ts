import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import {
    EntryMethod,
    ExitMethod,
    PresenceSession,
} from "@modules/portal/crm/presence/domain/entity/presence-session.entity";
import { NOT_PRESENT } from "@modules/portal/crm/presence/domain/presence-errors";
import {
    PresenceFilters,
    PresenceSessionRepository,
    PresenceStats,
} from "@modules/portal/crm/presence/domain/repositories/presence-session-repository.interface";
import { QrCodesService } from "@modules/portal/crm/qr-codes/application/services/qr-codes.service";
import {
    QR_SCAN_ERROR_MESSAGES,
    QrScanErrorCode,
} from "@modules/portal/crm/qr-codes/domain/qr-scan-error";

import { presenceEnteredEvent, presenceLeftEvent } from "../events/presence-events";

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

    async findById(id: string, portalId: string): Promise<PresenceSession | null> {
        return this.sessionRepository.findById(id, portalId);
    }

    async findActiveByMemberId(
        memberId: string,
        portalId: string
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
    // Manual Check-in (Employee). Скан QR на стойке — ConfirmDoorScanUseCase
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

        const session = await this.sessionRepository.createEntry(
            { memberId, employeeId, entryMethod: EntryMethod.MANUAL_EMPLOYEE, portalId },
            (created) => [presenceEnteredEvent(portalId, created, employeeId)]
        );

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
        const activeSession = await this.sessionRepository.findActiveByMemberId(memberId, portalId);

        if (!activeSession) {
            throw new BadRequestException(
                `У участника "${memberId}" нет активной сессии присутствия`
            );
        }

        const session = await this.sessionRepository.closeOpenSession(
            activeSession.id,
            { exitMethod: ExitMethod.MANUAL_EMPLOYEE, employeeId },
            (left) => [presenceLeftEvent(portalId, left, employeeId)]
        );
        if (!session) {
            throw new ConflictException({
                message: "The member is not in the club",
                code: NOT_PRESENT,
            });
        }

        this.logger.log(
            `🚪 Выход (ручной): участник ${memberId}, сотрудник ${employeeId}, ` +
                `длительность ${session.getDurationMinutes() ?? "?"} мин`
        );

        return session;
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
        code: string,
        portalId: string
    ): Promise<{
        valid: boolean;
        errorCode?: QrScanErrorCode;
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
        const scanResult = await this.qrCodesService.validateScannedCode(code, portalId);

        if (!scanResult.valid) {
            return {
                valid: false,
                errorCode: scanResult.errorCode,
                error: scanResult.error,
                isPresent: false,
                proposedAction: "entry",
            };
        }

        const memberId = scanResult.memberId!;

        // 2. Текущий визит (без создания). Участника не в этом клубе код уже отсёк как wrong_club;
        // NotFound здесь — участника удалили между проверкой и чтением.
        let activeSession: PresenceSession | null;
        try {
            activeSession = await this.sessionRepository.findActiveByMemberId(memberId, portalId);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return {
                    valid: false,
                    errorCode: "wrong_club",
                    error: QR_SCAN_ERROR_MESSAGES.wrong_club,
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
    async isMemberPresent(memberId: string, portalId: string): Promise<boolean> {
        const session = await this.sessionRepository.findActiveByMemberId(memberId, portalId);
        return session !== null;
    }
}

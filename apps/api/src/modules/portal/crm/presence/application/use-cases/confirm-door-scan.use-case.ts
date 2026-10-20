import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";

import { QrCodesService } from "@modules/portal/crm/qr-codes/application/services/qr-codes.service";

import {
    EntryMethod,
    ExitMethod,
    PresenceSession,
} from "../../domain/entity/presence-session.entity";
import { NOT_PRESENT } from "../../domain/presence-errors";
import { PresenceSessionRepository } from "../../domain/repositories/presence-session-repository.interface";
import { presenceEnteredEvent, presenceLeftEvent } from "../events/presence-events";

export type DoorAction = "entry" | "exit";

export interface DoorScanResult {
    action: DoorAction;
    session: PresenceSession;
    /** То же действие уже было записано (второе нажатие, второй сотрудник) — ничего не изменилось */
    repeated: boolean;
}

/**
 * Сотрудник на стойке подтверждает вход или выход, который показал предпросмотр QR.
 * Правила сценария (TASK-714):
 * - действие приходит явно: сервер не переключает вход/выход сам, поэтому повторное
 *   подтверждение не превращает вход в выход;
 * - повтор «входа» отдаёт уже открытую сессию (`repeated`), повтор «выхода» — 409 `not_present`;
 * - запрос идёт под ключом идемпотентности предпросмотра, так что двойное нажатие одного
 *   сотрудника получает тот же ответ, а не второй запрос;
 * - отметка запоминает сотрудника, который подтвердил.
 */
@Injectable()
export class ConfirmDoorScanUseCase {
    private readonly logger = new Logger(ConfirmDoorScanUseCase.name);

    constructor(
        private readonly qrCodes: QrCodesService,
        private readonly sessions: PresenceSessionRepository
    ) {}

    async execute(command: {
        code: string;
        action: DoorAction;
        portalId: string;
        employeeId: string;
    }): Promise<DoorScanResult> {
        const { action, portalId, employeeId } = command;
        const scan = await this.qrCodes.validateScannedCode(command.code, portalId);
        if (!scan.valid || !scan.memberId) {
            // В errors лежит код причины: клиент показывает перевод, а не строку сервера
            throw new BadRequestException({
                message: scan.error ?? "Invalid QR code",
                errors: scan.errorCode ? [scan.errorCode] : [],
            });
        }
        const memberId = scan.memberId;
        const open = await this.sessions.findActiveByMemberId(memberId, portalId);

        if (action === "entry") {
            if (open) return { action, session: open, repeated: true };
            const session = await this.sessions.createEntry(
                { memberId, employeeId, entryMethod: EntryMethod.QR, portalId },
                (created) => [presenceEnteredEvent(portalId, created, employeeId)]
            );
            this.logger.log(`🚪 Вход (QR): участник ${memberId}, сотрудник ${employeeId}`);
            return { action, session, repeated: false };
        }

        const closed = open
            ? await this.sessions.closeOpenSession(
                  open.id,
                  { exitMethod: ExitMethod.QR, employeeId },
                  (left) => [presenceLeftEvent(portalId, left, employeeId)]
              )
            : null;
        if (!closed) {
            throw new ConflictException({
                message: "The member is not in the club",
                code: NOT_PRESENT,
            });
        }
        this.logger.log(
            `🚪 Выход (QR): участник ${memberId}, был в клубе ${closed.getDurationMinutes() ?? "?"} мин`
        );
        return { action, session: closed, repeated: false };
    }
}

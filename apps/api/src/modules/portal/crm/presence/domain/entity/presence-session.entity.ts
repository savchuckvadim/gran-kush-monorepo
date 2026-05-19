/**
 * Методы входа/выхода
 */
export enum EntryMethod {
    QR = "qr",
    MANUAL_EMPLOYEE = "manual_employee",
}

export enum ExitMethod {
    QR = "qr",
    MANUAL_EMPLOYEE = "manual_employee",
    AUTO_CRON = "auto_cron",
}

/**
 * Domain Entity — PresenceSession (Сессия присутствия)
 *
 * Каждый вход члена клуба создаёт новую сессию.
 * Выход закрывает сессию (ставит exitedAt + exitMethod).
 */
export class PresenceSession {
    id: string;
    memberId: string;
    employeeId?: string | null;

    enteredAt: Date;
    exitedAt?: Date | null;

    entryMethod: string; // EntryMethod value
    exitMethod?: string | null; // ExitMethod value

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
    employee?: {
        id: string;
        name: string;
        surname?: string | null;
    };

    constructor(partial: Partial<PresenceSession>) {
        Object.assign(this, partial);
    }

    /** Активна ли сессия (вход есть, выхода нет) */
    isActive(): boolean {
        return this.exitedAt === null || this.exitedAt === undefined;
    }

    /** Длительность сессии в минутах (для завершённых сессий) */
    getDurationMinutes(): number | null {
        if (!this.exitedAt) return null;
        return Math.round((this.exitedAt.getTime() - this.enteredAt.getTime()) / 60_000);
    }
}

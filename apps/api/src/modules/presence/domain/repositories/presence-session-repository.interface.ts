import { PresenceSession } from "@presence/domain/entity/presence-session.entity";

// ─── Фильтры ────────────────────────────────────────────────────────────────

export interface PresenceFilters {
    memberId?: string;
    employeeId?: string;
    /** Только активные (не закрытые) */
    isActive?: boolean;
    entryMethod?: string;
    exitMethod?: string;
    startDate?: Date;
    endDate?: Date;
}

// ─── Статистика ─────────────────────────────────────────────────────────────

export interface PresenceStats {
    /** Текущее количество присутствующих */
    currentlyPresent: number;
    /** Всего посещений за период */
    totalVisits: number;
    /** Средняя длительность визита (мин) */
    avgDurationMinutes: number | null;
}

// ─── Интерфейс репозитория ──────────────────────────────────────────────────

export abstract class PresenceSessionRepository {
    /** Найти сессию по ID */
    abstract findById(id: string): Promise<PresenceSession | null>;

    /** Найти активную (незакрытую) сессию участника */
    abstract findActiveByMemberId(memberId: string): Promise<PresenceSession | null>;

    /** Все сессии с фильтрами, пагинацией и сортировкой */
    abstract findAll(
        filters?: PresenceFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<PresenceSession[]>;

    /** Подсчёт сессий */
    abstract count(filters?: PresenceFilters): Promise<number>;

    /** Создать запись о входе */
    abstract createEntry(data: {
        memberId: string;
        employeeId?: string;
        entryMethod: string;
    }): Promise<PresenceSession>;

    /** Закрыть сессию (выход) */
    abstract closeSession(
        id: string,
        data: {
            exitMethod: string;
            employeeId?: string;
        }
    ): Promise<PresenceSession>;

    /** Найти все незакрытые сессии (для auto_cron) */
    abstract findAllActive(): Promise<PresenceSession[]>;

    /** Массовое закрытие сессий (для auto_cron) */
    abstract closeMany(ids: string[], exitMethod: string): Promise<number>;

    /** Текущее количество присутствующих */
    abstract countCurrentlyPresent(): Promise<number>;

    /** Статистика за период */
    abstract getStats(startDate?: Date, endDate?: Date, memberId?: string): Promise<PresenceStats>;
}

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type EventsOf } from "@modules/events";

import { ExitMethod } from "../../domain/entity/presence-session.entity";
import { DEFAULT_PRESENCE_SETTINGS, type PresenceSettings } from "../../domain/presence-settings";
import {
    ClosedPresenceSession,
    PresenceSettingsRepository,
} from "../../domain/repositories/presence-settings-repository.interface";

const SELECT = { timezone: true, autoExitTime: true, maxSessionHours: true } as const;

@Injectable()
export class PresenceSettingsPrismaRepository implements PresenceSettingsRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {}

    async find(portalId: string): Promise<PresenceSettings | null> {
        return this.prisma.presenceSettings.findUnique({ where: { portalId }, select: SELECT });
    }

    async save(portalId: string, settings: PresenceSettings): Promise<PresenceSettings> {
        return this.prisma.presenceSettings.upsert({
            where: { portalId },
            create: { portalId, ...settings },
            update: settings,
            select: SELECT,
        });
    }

    /*
     * Один UPDATE на все клубы. Время в колонках — UTC без зоны (timestamp(3)), поэтому всё
     * сводится к нему явно и не зависит от часового пояса сессии БД:
     * - rules     — правила клубов, у которых есть открытые визиты (без строки — по умолчанию);
     * - local_now — «сейчас» по часовому поясу клуба;
     * - cutoff    — последний наступивший авто-выход клуба (сегодня или вчера), в UTC;
     * - exit_at   — момент правила: авто-выход или начало + потолок, что раньше (LEAST
     *               пропускает NULL); визит без сработавшего правила не трогается.
     * Условие exited_at IS NULL повторено в самом UPDATE: параллельный выход не переписывается.
     */
    async closeDueSessions(
        now: Date,
        events?: EventsOf<readonly ClosedPresenceSession[]>
    ): Promise<number> {
        const d = DEFAULT_PRESENCE_SETTINGS;
        return this.prisma.$transaction(async (tx) => {
            const closed = await tx.$queryRaw<
                { session_id: string; portal_id: string; member_id: string }[]
            >`
            WITH clock AS (
                SELECT (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC') AS now_utc
            ),
            rules AS (
                SELECT DISTINCT
                    er.portal_id,
                    COALESCE(s.timezone, ${d.timezone}) AS tz,
                    COALESCE(s.auto_exit_time, ${d.autoExitTime})::time AS exit_time,
                    s.max_session_hours AS max_hours
                FROM presence_sessions ps
                JOIN entity_records er ON er.id = ps.entity_record_id
                LEFT JOIN presence_settings s ON s.portal_id = er.portal_id
                WHERE ps.exited_at IS NULL
            ),
            cutoffs AS (
                SELECT
                    r.portal_id,
                    r.max_hours,
                    c.now_utc,
                    ((CASE WHEN l.today_exit > l.local_now
                           THEN l.today_exit - interval '1 day'
                           ELSE l.today_exit
                      END) AT TIME ZONE r.tz) AT TIME ZONE 'UTC' AS cutoff
                FROM rules r
                CROSS JOIN clock c
                CROSS JOIN LATERAL (
                    SELECT (c.now_utc AT TIME ZONE 'UTC') AT TIME ZONE r.tz AS local_now
                ) n
                CROSS JOIN LATERAL (
                    SELECT n.local_now, date_trunc('day', n.local_now) + r.exit_time AS today_exit
                ) l
            ),
            due AS (
                SELECT
                    ps.id,
                    er.portal_id,
                    m.id AS member_id,
                    LEAST(
                        CASE WHEN ps.entered_at < k.cutoff THEN k.cutoff END,
                        CASE
                            WHEN k.max_hours IS NOT NULL
                                 AND ps.entered_at + make_interval(hours => k.max_hours) <= k.now_utc
                            THEN ps.entered_at + make_interval(hours => k.max_hours)
                        END
                    ) AS exit_at,
                    k.now_utc
                FROM presence_sessions ps
                JOIN entity_records er ON er.id = ps.entity_record_id
                JOIN members m ON m.entity_record_id = ps.entity_record_id
                JOIN cutoffs k ON k.portal_id = er.portal_id
                WHERE ps.exited_at IS NULL
            )
            UPDATE presence_sessions p
            SET exited_at = due.exit_at,
                exit_method = ${ExitMethod.AUTO_CRON},
                active_entity_record_id = NULL,
                updated_at = due.now_utc
            FROM due
            WHERE p.id = due.id AND due.exit_at IS NOT NULL AND p.exited_at IS NULL
            RETURNING p.id AS session_id, due.portal_id, due.member_id
        `;
            const sessions = closed.map((row) => ({
                sessionId: row.session_id,
                portalId: row.portal_id,
                memberId: row.member_id,
            }));
            if (events && sessions.length > 0) {
                await this.events.publishMany(tx, events(sessions));
            }
            return sessions.length;
        });
    }
}

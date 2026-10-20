import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

/** Чьё соединение и в каком клубе — снимок на момент рукопожатия. */
export interface RealtimeConnection {
    audience: SessionAudience;
    userId: string;
    sessionId: string;
    /** Срок access-токена: в этот момент сервер закрывает соединение, клиент обновляет токен */
    expiresAt: Date | null;
    /** Клуб из рукопожатия; без клуба — только события аккаунта (мои клубы, сессии) */
    portal: RealtimePortalMembership | null;
}

export type RealtimePortalMembership =
    | {
          kind: "employee";
          portalId: string;
          employeeId: string;
          roleId: string;
          permissions: readonly string[];
      }
    | { kind: "member"; portalId: string; memberId: string };

import { Injectable, Logger } from "@nestjs/common";

import type { Namespace, Socket } from "socket.io";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import type { RealtimeConnection } from "../domain/realtime-connection";
import { connectionRooms } from "../domain/realtime-rooms";
import { REALTIME_EVENT_MESSAGE } from "../realtime.constants";

import {
    RealtimeAuthService,
    type RealtimeHandshake,
    RealtimeRejection,
} from "./realtime-auth.service";

interface SocketState {
    connection?: RealtimeConnection;
    expiryTimer?: NodeJS.Timeout;
}

/** Таймер Node не ждёт дольше ~24,8 суток; access-токен живёт минуты, это только страховка */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Соединения realtime обоих приложений: рукопожатие, комнаты, срок жизни и отправка событий.
 * Гейтвеи неймспейсов регистрируют здесь свои серверы и больше ничего не делают.
 */
@Injectable()
export class RealtimeHubService {
    private readonly logger = new Logger(RealtimeHubService.name);
    private readonly namespaces = new Map<SessionAudience, Namespace>();

    constructor(private readonly auth: RealtimeAuthService) {}

    /** Неймспейс приложения: проверка рукопожатия до события `connection`. */
    register(audience: SessionAudience, namespace: Namespace): void {
        this.namespaces.set(audience, namespace);
        namespace.use((socket, next) => {
            this.auth
                .authenticate(socket.handshake as unknown as RealtimeHandshake, audience)
                .then((connection) => {
                    (socket.data as SocketState).connection = connection;
                    next();
                })
                .catch((error: unknown) => {
                    if (error instanceof RealtimeRejection) {
                        next(new Error(error.code));
                        return;
                    }
                    this.logger.error(
                        `Рукопожатие realtime: ${error instanceof Error ? error.message : String(error)}`
                    );
                    next(new Error("internal_error"));
                });
        });
    }

    async connected(socket: Socket): Promise<void> {
        const state = socket.data as SocketState;
        const connection = state.connection;
        if (!connection) {
            socket.disconnect(true);
            return;
        }
        await socket.join(connectionRooms(connection));
        if (connection.expiresAt) {
            const ms = connection.expiresAt.getTime() - Date.now();
            state.expiryTimer = setTimeout(
                () => socket.disconnect(true),
                Math.max(0, Math.min(ms, MAX_TIMER_MS))
            );
        }
    }

    disconnected(socket: Socket): void {
        const state = socket.data as SocketState;
        if (state.expiryTimer) clearTimeout(state.expiryTimer);
    }

    emit(audience: SessionAudience, rooms: readonly string[], message: unknown): void {
        const namespace = this.namespaces.get(audience);
        if (!namespace || rooms.length === 0) return;
        namespace.to([...rooms]).emit(REALTIME_EVENT_MESSAGE, message);
    }

    /**
     * Разорвать соединения комнаты на всех инстансах API (через Redis-адаптер). Клиент
     * подключается заново и получает комнаты по текущим правам — или отказ.
     */
    disconnect(audience: SessionAudience, room: string): void {
        this.namespaces.get(audience)?.in(room).disconnectSockets(true);
    }
}

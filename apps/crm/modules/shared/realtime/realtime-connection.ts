import { io, type Socket } from "socket.io-client";

import type { DomainEvent } from "@workspace/domain-events";

import { API_BASE_URL } from "@/modules/shared/api/api";

import {
    REALTIME_ERRORS,
    REALTIME_MAX_REFRESH_ATTEMPTS,
    REALTIME_RECONNECT_DELAY_MAX_MS,
    REALTIME_RETRY_MS,
    SERVER_DISCONNECT_REASON,
} from "./realtime.config";
import type { RealtimeAudience, RealtimeStatus } from "./realtime.types";

export interface RealtimeConnectionOptions {
    audience: RealtimeAudience;
    portal: string | null;
    /** Обновить сессию по refresh-куке (тот же механизм, что у API-клиента) */
    refresh: () => Promise<void>;
    onEvent: (event: DomainEvent) => void;
    onStatus: (status: RealtimeStatus) => void;
    /** Соединение восстановлено после обрыва: события за это время могли пропасть */
    onResync: () => void;
}

/**
 * Соединение с realtime-шлюзом API. Только WebSocket, куки — `withCredentials`. Сеть рвётся —
 * socket.io переподключается сам; сервер отказал или закрыл соединение (истёк токен, отозвана
 * сессия, изменились права) — сначала обновляем сессию, потом подключаемся снова.
 */
export class RealtimeConnection {
    private readonly socket: Socket;
    private refreshAttempts = 0;
    private everConnected = false;
    private closed = false;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly options: RealtimeConnectionOptions) {
        this.socket = io(`${API_BASE_URL}/${options.audience}`, {
            transports: ["websocket"],
            withCredentials: true,
            autoConnect: false,
            reconnectionDelayMax: REALTIME_RECONNECT_DELAY_MAX_MS,
            auth: options.portal ? { portal: options.portal } : {},
        });
        this.socket.on("connect", () => this.connected());
        this.socket.on("event", (event: DomainEvent) => options.onEvent(event));
        this.socket.on("connect_error", (error) => this.rejected(error.message));
        this.socket.on("disconnect", (reason) => this.dropped(reason));
    }

    start(): void {
        this.options.onStatus("connecting");
        this.socket.connect();
    }

    stop(): void {
        this.closed = true;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.socket.removeAllListeners();
        this.socket.disconnect();
    }

    private connected(): void {
        if (this.everConnected) this.options.onResync();
        this.everConnected = true;
        this.refreshAttempts = 0;
        this.options.onStatus("online");
    }

    private rejected(code: string): void {
        if (this.closed) return;
        if (code === REALTIME_ERRORS.unauthorized) {
            void this.refreshAndConnect();
            return;
        }
        if (code === REALTIME_ERRORS.forbidden || code === REALTIME_ERRORS.originNotAllowed) {
            this.options.onStatus("denied");
            return;
        }
        this.options.onStatus("offline");
        // отказ сервера socket.io не повторяет сам, обрыв сети — повторяет
        if (!this.socket.active) this.retryLater();
    }

    private dropped(reason: string): void {
        if (this.closed) return;
        this.options.onStatus("offline");
        if (reason === SERVER_DISCONNECT_REASON) void this.refreshAndConnect();
    }

    private async refreshAndConnect(): Promise<void> {
        if (this.refreshAttempts >= REALTIME_MAX_REFRESH_ATTEMPTS) {
            this.options.onStatus("offline");
            return;
        }
        this.refreshAttempts += 1;
        try {
            await this.options.refresh();
        } catch {
            // сессия закончилась: на выход уведёт обычный 401 первого же запроса
            this.options.onStatus("offline");
            return;
        }
        if (!this.closed) this.socket.connect();
    }

    private retryLater(): void {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            if (!this.closed) this.socket.connect();
        }, REALTIME_RETRY_MS);
    }
}

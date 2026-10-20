import {
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
    WebSocketGateway,
} from "@nestjs/websockets";

import type { Namespace, Socket } from "socket.io";

import { RealtimeHubService } from "../application/realtime-hub.service";
import { REALTIME_NAMESPACES, REALTIME_TRANSPORTS } from "../realtime.constants";

/** Realtime кабинета участника: `wss://<api>/socket.io`, неймспейс `/cabinet`. */
@WebSocketGateway({ namespace: REALTIME_NAMESPACES.cabinet, transports: [...REALTIME_TRANSPORTS] })
export class CabinetRealtimeGateway
    implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
    constructor(private readonly hub: RealtimeHubService) {}

    afterInit(namespace: Namespace): void {
        this.hub.register("cabinet", namespace);
    }

    handleConnection(socket: Socket): Promise<void> {
        return this.hub.connected(socket);
    }

    handleDisconnect(socket: Socket): void {
        this.hub.disconnected(socket);
    }
}

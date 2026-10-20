import {
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
    WebSocketGateway,
} from "@nestjs/websockets";

import type { Namespace, Socket } from "socket.io";

import { RealtimeHubService } from "../application/realtime-hub.service";
import { REALTIME_NAMESPACES, REALTIME_TRANSPORTS } from "../realtime.constants";

/** Realtime сотрудников CRM: `wss://<api>/socket.io`, неймспейс `/crm`. */
@WebSocketGateway({ namespace: REALTIME_NAMESPACES.crm, transports: [...REALTIME_TRANSPORTS] })
export class CrmRealtimeGateway
    implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
    constructor(private readonly hub: RealtimeHubService) {}

    afterInit(namespace: Namespace): void {
        this.hub.register("crm", namespace);
    }

    handleConnection(socket: Socket): Promise<void> {
        return this.hub.connected(socket);
    }

    handleDisconnect(socket: Socket): void {
        this.hub.disconnected(socket);
    }
}

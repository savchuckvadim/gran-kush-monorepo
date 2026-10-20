import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent } from "@modules/events";

import { FinanceAuditLog } from "../../domain/repositories/finance-sources.interface";

@Injectable()
export class FinanceAuditPrismaLog extends FinanceAuditLog {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async record(events: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction((tx) => this.events.publishMany(tx, events));
    }
}

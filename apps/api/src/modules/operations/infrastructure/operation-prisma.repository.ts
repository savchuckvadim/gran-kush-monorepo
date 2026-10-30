import { Injectable } from "@nestjs/common";

import { type Operation as OperationRow, OperationStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent } from "@modules/events";

import type { JsonObject, Operation } from "../domain/operation";
import {
    type CreateOperationOutcome,
    type NewOperation,
    OperationRepository,
} from "../domain/repositories/operation-repository.interface";

const toEntity = (row: OperationRow): Operation => ({
    id: row.id,
    portalId: row.portalId,
    kind: row.kind,
    status: row.status,
    requestedByEmployeeId: row.requestedByEmployeeId,
    input: row.input as JsonObject,
    result: row.result as JsonObject | null,
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
});

const toJson = (value: JsonObject | null): Prisma.InputJsonValue | typeof Prisma.DbNull =>
    value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

@Injectable()
export class OperationPrismaRepository extends OperationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async create(input: NewOperation): Promise<CreateOperationOutcome> {
        const data = {
            portalId: input.portalId,
            kind: input.kind,
            requestedByEmployeeId: input.requestedByEmployeeId,
            idempotencyKey: input.idempotencyKey,
            inputHash: input.inputHash,
            input: input.input as Prisma.InputJsonValue,
        };
        if (!input.idempotencyKey) {
            return {
                kind: "created",
                operation: toEntity(await this.prisma.operation.create({ data })),
            };
        }
        // ON CONFLICT DO NOTHING вместо перехвата P2002: повтор клиента — обычный путь, не исключение
        const { count } = await this.prisma.operation.createMany({
            data: [data],
            skipDuplicates: true,
        });
        const row = await this.prisma.operation.findFirst({
            where: {
                portalId: input.portalId,
                requestedByEmployeeId: input.requestedByEmployeeId,
                kind: input.kind,
                idempotencyKey: input.idempotencyKey,
            },
        });
        if (!row) {
            // строку с ключом убрали между вставкой и чтением (клуб или сотрудник удалены): без дедупликации
            return {
                kind: "created",
                operation: toEntity(await this.prisma.operation.create({ data })),
            };
        }
        if (count === 1) return { kind: "created", operation: toEntity(row) };
        return row.inputHash === input.inputHash
            ? { kind: "existing", operation: toEntity(row) }
            : { kind: "mismatch" };
    }

    async findById(id: string): Promise<Operation | null> {
        const row = await this.prisma.operation.findUnique({ where: { id } });
        return row ? toEntity(row) : null;
    }

    async findForRequester(
        id: string,
        portalId: string,
        employeeId: string
    ): Promise<Operation | null> {
        const row = await this.prisma.operation.findFirst({
            where: { id, portalId, requestedByEmployeeId: employeeId },
        });
        return row ? toEntity(row) : null;
    }

    async start(id: string): Promise<Operation | null> {
        const { count } = await this.prisma.operation.updateMany({
            where: { id, status: OperationStatus.queued },
            data: { status: OperationStatus.running, startedAt: new Date() },
        });
        return count === 1 ? this.findById(id) : null;
    }

    async finish(
        id: string,
        result: JsonObject | null,
        events: readonly NewDomainEvent[]
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.operation.update({
                where: { id },
                data: {
                    status: OperationStatus.done,
                    result: toJson(result),
                    finishedAt: new Date(),
                },
            });
            await this.events.publishMany(tx, events);
        });
    }

    async fail(id: string, error: string, events: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.operation.update({
                where: { id },
                data: { status: OperationStatus.failed, error, finishedAt: new Date() },
            });
            await this.events.publishMany(tx, events);
        });
    }
}

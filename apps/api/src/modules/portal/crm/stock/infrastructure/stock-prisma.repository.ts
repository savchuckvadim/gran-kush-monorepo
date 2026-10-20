import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent, type OutboxTransaction } from "@modules/events";
import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";

import { averageCostAfterPurchase, type StockMove } from "../domain/stock-move";
import {
    type NewPurchase,
    type PurchaseView,
    type StockMoveFilter,
    type StockMoveInput,
    StockRepository,
    type StockState,
} from "../domain/stock-repository.interface";

const MOVE_INCLUDE = { product: { select: { name: true } } } satisfies Prisma.StockMoveInclude;

type StockMoveRow = Prisma.StockMoveGetPayload<{ include: typeof MOVE_INCLUDE }>;

const toMove = (row: StockMoveRow): StockMove => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    reason: row.reason,
    quantity: Number(row.quantity),
    unitCost: Number(row.unitCost),
    balanceAfter: Number(row.balanceAfter),
    orderId: row.orderId,
    purchaseId: row.purchaseId,
    note: row.note,
    employeeId: row.employeeId,
    occurredAt: row.occurredAt,
});

const STATE_SELECT = {
    id: true,
    name: true,
    currentQuantity: true,
    averageCost: true,
    isAvailable: true,
} satisfies Prisma.ProductSelect;

const toState = (row: Prisma.ProductGetPayload<{ select: typeof STATE_SELECT }>): StockState => ({
    productId: row.id,
    name: row.name,
    currentQuantity: Number(row.currentQuantity),
    averageCost: row.averageCost === null ? null : Number(row.averageCost),
    isAvailable: row.isAvailable,
});

const toDbDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

@Injectable()
export class StockPrismaRepository extends StockRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async stateOf(portalId: string, productId: string): Promise<StockState | null> {
        const row = await this.prisma.product.findFirst({
            where: { id: productId, portalId },
            select: STATE_SELECT,
        });
        return row ? toState(row) : null;
    }

    async statesOf(portalId: string, productIds: readonly string[]): Promise<StockState[]> {
        if (productIds.length === 0) return [];
        const rows = await this.prisma.product.findMany({
            where: { portalId, id: { in: [...productIds] } },
            select: STATE_SELECT,
        });
        return rows.map(toState);
    }

    async moves(
        portalId: string,
        filter: StockMoveFilter,
        page: { skip: number; take: number }
    ): Promise<{ items: StockMove[]; total: number }> {
        const where: Prisma.StockMoveWhereInput = {
            portalId,
            ...(filter.productId ? { productId: filter.productId } : {}),
            ...(filter.from || filter.to
                ? {
                      occurredAt: {
                          ...(filter.from ? { gte: filter.from } : {}),
                          ...(filter.to ? { lte: filter.to } : {}),
                      },
                  }
                : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.stockMove.findMany({
                where,
                include: MOVE_INCLUDE,
                orderBy: { occurredAt: "desc" },
                skip: page.skip,
                take: page.take,
            }),
            this.prisma.stockMove.count({ where }),
        ]);
        return { items: rows.map(toMove), total };
    }

    async move(tx: OutboxTransaction, portalId: string, input: StockMoveInput): Promise<StockMove> {
        const quantity = new Prisma.Decimal(input.quantity);
        const outgoing = quantity.lessThan(0);
        // UPDATE несёт проверку остатка: параллельный расход ждёт блокировку строки и видит свежий остаток
        const { count } = await tx.product.updateMany({
            where: {
                id: input.productId,
                portalId,
                ...(outgoing ? { currentQuantity: { gte: quantity.abs() } } : {}),
            },
            data: { currentQuantity: { increment: quantity } },
        });
        if (count === 0) throw new InsufficientStockError(input.productId);
        const product = await tx.product.findUniqueOrThrow({
            where: { id: input.productId },
            select: { currentQuantity: true, averageCost: true },
        });
        if (product.currentQuantity.lessThanOrEqualTo(0)) {
            await tx.product.update({
                where: { id: input.productId },
                data: { isAvailable: false },
            });
        } else if (!outgoing) {
            await tx.product.updateMany({
                where: { id: input.productId, isAvailable: false, currentQuantity: { gt: 0 } },
                data: { isAvailable: true },
            });
        }
        const unitCost =
            input.unitCost ?? (product.averageCost === null ? 0 : Number(product.averageCost));
        const row = await tx.stockMove.create({
            data: {
                portalId,
                productId: input.productId,
                reason: input.reason,
                quantity,
                unitCost: new Prisma.Decimal(unitCost),
                balanceAfter: product.currentQuantity,
                orderId: input.orderId ?? null,
                purchaseId: input.purchaseId ?? null,
                note: input.note ?? null,
                employeeId: input.employeeId ?? null,
            },
            include: MOVE_INCLUDE,
        });
        return toMove(row);
    }

    async moveManually(
        portalId: string,
        input: StockMoveInput,
        events: (move: StockMove) => NewDomainEvent[]
    ): Promise<StockMove> {
        return this.prisma.$transaction(async (tx) => {
            const move = await this.move(tx, portalId, input);
            await this.events.publishMany(tx, events(move));
            return move;
        });
    }

    async purchase(
        portalId: string,
        purchase: NewPurchase,
        ledger: (tx: OutboxTransaction) => Promise<string | null>,
        events: (move: StockMove) => NewDomainEvent[]
    ): Promise<{ purchaseId: string; move: StockMove }> {
        return this.prisma.$transaction(async (tx) => {
            const before = await tx.product.findFirstOrThrow({
                where: { id: purchase.productId, portalId },
                select: { currentQuantity: true, averageCost: true },
            });
            const averageCost = averageCostAfterPurchase(
                Number(before.currentQuantity),
                before.averageCost === null ? null : Number(before.averageCost),
                purchase.quantity,
                purchase.unitCost
            );
            const ledgerEntryId = await ledger(tx);
            await tx.purchase.create({
                data: {
                    id: purchase.id,
                    portalId,
                    productId: purchase.productId,
                    quantity: new Prisma.Decimal(purchase.quantity),
                    unitCost: new Prisma.Decimal(purchase.unitCost),
                    ledgerEntryId,
                    counterpartyId: purchase.counterpartyId,
                    receivedOn: toDbDate(purchase.receivedOn),
                    employeeId: purchase.employeeId,
                },
            });
            const move = await this.move(tx, portalId, {
                productId: purchase.productId,
                reason: "purchase",
                quantity: purchase.quantity,
                unitCost: purchase.unitCost,
                purchaseId: purchase.id,
                employeeId: purchase.employeeId,
            });
            await tx.product.update({
                where: { id: purchase.productId },
                data: { averageCost: new Prisma.Decimal(averageCost) },
            });
            await this.events.publishMany(tx, events(move));
            return { purchaseId: purchase.id, move };
        });
    }

    async purchases(
        portalId: string,
        filter: { productId?: string; from?: string; to?: string },
        page: { skip: number; take: number }
    ): Promise<{ items: PurchaseView[]; total: number }> {
        const where: Prisma.PurchaseWhereInput = {
            portalId,
            ...(filter.productId ? { productId: filter.productId } : {}),
            ...(filter.from || filter.to
                ? {
                      receivedOn: {
                          ...(filter.from ? { gte: toDbDate(filter.from) } : {}),
                          ...(filter.to ? { lte: toDbDate(filter.to) } : {}),
                      },
                  }
                : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.purchase.findMany({
                where,
                include: { product: { select: { name: true } } },
                orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
                skip: page.skip,
                take: page.take,
            }),
            this.prisma.purchase.count({ where }),
        ]);
        return {
            items: rows.map((row) => ({
                id: row.id,
                productId: row.productId,
                productName: row.product.name,
                quantity: Number(row.quantity),
                unitCost: Number(row.unitCost),
                total: Math.round(Number(row.quantity) * Number(row.unitCost) * 100) / 100,
                counterpartyId: row.counterpartyId,
                ledgerEntryId: row.ledgerEntryId,
                receivedOn: row.receivedOn.toISOString().slice(0, 10),
                employeeId: row.employeeId,
                createdAt: row.createdAt,
            })),
            total,
        };
    }
}

import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { Order, OrderStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import {
    isClosedStage,
    isFailureStage,
    lifecycleFieldFor,
    memberMayCancel,
    stageForLegacyStatus,
} from "@modules/portal/crm/orders/domain/order-stage.rules";
import {
    OrderFilters,
    OrderRepository,
    StockLine,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { OrderStageRepository } from "@modules/portal/crm/orders/domain/repositories/order-stage-repository.interface";
import { StagePositionService } from "@modules/portal/crm/records/application/services/stage-position.service";

import { OrdersService } from "./orders.service";

const STAGE_RACE_MESSAGE = "Стадию заказа изменил параллельный запрос — обновите заказ";

/** Что вернуть на склад при отмене заказа */
const stockLinesOf = (order: Order): StockLine[] =>
    (order.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
    }));

/**
 * Жизнь заказа по стадиям воронки: переходы в CRM (полоса стадий, канбан), старый `status`
 * для совместимости и отмена участником. Правила переходов — в `order-stage.rules.ts`.
 */
@Injectable()
export class OrderStagesService {
    private readonly logger = new Logger(OrderStagesService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly stageRepository: OrderStageRepository,
        private readonly orders: OrdersService,
        private readonly positions: StagePositionService
    ) {}

    /**
     * Перевести заказ в стадию воронки (сотрудник CRM, manager+). Между рабочими стадиями —
     * в любую сторону; закрытый заказ не двигается; отмена возвращает товар на склад.
     * `afterOrderId` — сосед сверху в колонке канбана (null — наверх); в той же стадии это
     * перестановка карточки. Не передан: новая стадия ставит наверх, та же — ничего не меняет.
     */
    async moveToStage(
        orderId: string,
        stageId: string,
        employeeId: string,
        portalId: string,
        afterOrderId?: string | null
    ): Promise<Order> {
        const order = await this.orders.findByIdForPortalOrFail(orderId, portalId);
        const target = await this.stageRepository.findStageInPortal(portalId, stageId);
        if (!target) {
            throw new BadRequestException("Стадия не из воронки заказов этого клуба");
        }
        if (order.stage?.id === target.id) {
            if (afterOrderId !== undefined) {
                const card = await this.cardPlacement(order.id, target.id, portalId, afterOrderId);
                const kept =
                    !card ||
                    (await this.stageRepository.setStagePosition(
                        card.entityRecordId,
                        target.id,
                        card.position
                    ));
                if (!kept) throw new ConflictException(STAGE_RACE_MESSAGE);
            }
            return order;
        }
        const card = await this.cardPlacement(order.id, target.id, portalId, afterOrderId ?? null);
        return this.applyStage(order, target, portalId, {
            employeeId,
            stagePosition: card?.position,
        });
    }

    /** Место карточки заказа в колонке `stageId` под соседом `afterOrderId` (null — наверх). */
    private async cardPlacement(
        orderId: string,
        stageId: string,
        portalId: string,
        afterOrderId: string | null
    ): Promise<{ entityRecordId: string; position: number } | null> {
        const card = await this.stageRepository.findCardRecord(orderId, portalId);
        if (!card) return null;
        const after = afterOrderId
            ? await this.stageRepository.findCardRecord(afterOrderId, portalId)
            : null;
        const position = await this.positions.positionFor(
            { portalId, entityDefinitionId: card.entityDefinitionId, stageId },
            card.entityRecordId,
            after?.entityRecordId ?? null
        );
        return { entityRecordId: card.entityRecordId, position };
    }

    /**
     * Обновить статус заказа старым способом (совместимость): статус переводится в стадию
     * воронки заказа, дальше — те же правила, что у {@link moveToStage}.
     */
    async updateStatus(
        orderId: string,
        newStatus: OrderStatus,
        employeeId: string,
        portalId: string,
        adminNotes?: string
    ): Promise<Order> {
        const order = await this.orders.findByIdForPortalOrFail(orderId, portalId);
        const stages = await this.stageRepository.findFunnelStages(
            portalId,
            order.stage?.stageCategoryId
        );
        const target = stageForLegacyStatus(stages, newStatus);
        if (!target) {
            throw new BadRequestException(`В воронке заказа нет стадии для статуса "${newStatus}"`);
        }
        return this.applyStage(order, target, portalId, { employeeId, adminNotes });
    }

    /** Стадии воронки, в которой стоит заказ (или воронки по умолчанию, если стадии нет), по порядку. */
    async funnelOf(order: Order, portalId: string): Promise<OrderStage[]> {
        return this.stageRepository.findFunnelStages(portalId, order.stage?.stageCategoryId);
    }

    /** Число и сумма заказов в стадиях воронки — шапки колонок канбана. */
    async summarizeFunnel(
        portalId: string,
        stageCategoryId: string,
        filters: Omit<OrderFilters, "portalId" | "stageId" | "status">
    ): Promise<OrderStageSummary[]> {
        const stages = await this.stageRepository.findFunnelStages(portalId, stageCategoryId);
        if (stages.length === 0) {
            throw new NotFoundException("Воронка заказов не найдена");
        }
        return this.stageRepository.summarizeByStage(
            { ...filters, portalId },
            stages.map((stage) => stage.id)
        );
    }

    /**
     * Отменить заказ (инициировано членом клуба). Только пока заказ в стадии «новый»:
     * дальше клуб уже взял его в работу.
     */
    async cancelOrderByMember(
        orderId: string,
        memberId: string,
        portalId: string,
        reason?: string
    ): Promise<Order> {
        const order = await this.orders.findByIdForPortalOrFail(orderId, portalId);

        // чужой заказ для участника не существует — как и в GET /cabinet/orders/:id
        if (order.memberId !== memberId) {
            throw new NotFoundException("Заказ не найден");
        }

        if (!memberMayCancel(order.stage)) {
            throw new BadRequestException(
                "Отмена невозможна: клуб уже взял заказ в работу. Отменить можно только новый заказ"
            );
        }

        const stages = await this.stageRepository.findFunnelStages(
            portalId,
            order.stage?.stageCategoryId
        );
        const cancelStage = stages.find(isFailureStage);
        if (!cancelStage) {
            throw new BadRequestException("В воронке заказа нет стадии отмены");
        }

        // заметки сотрудников остаются: отметка участника дописывается к ним
        const note = reason ? `Отменено участником: ${reason}` : "Отменено участником";
        const updated = await this.applyStage(order, cancelStage, portalId, {
            adminNotes: order.adminNotes ? `${order.adminNotes}\n${note}` : note,
        });

        this.logger.log(`❌ Заказ ${order.orderNumber} отменён участником ${memberId}`);

        return updated;
    }

    /**
     * Общий переход стадии: compare-and-set по текущей стадии, затем склад и метки жизненного
     * цикла. Проигравший параллельный запрос получает 409, а не тихий успех.
     */
    private async applyStage(
        order: Order,
        target: OrderStage,
        portalId: string,
        extra: { employeeId?: string; adminNotes?: string; stagePosition?: number }
    ): Promise<Order> {
        const current = order.stage ?? null;
        if (current?.id === target.id) {
            // Повтор того же перехода — запрос уже применён
            return order;
        }
        if (current && isClosedStage(current)) {
            throw new BadRequestException("Заказ закрыт: его стадию больше нельзя менять");
        }

        // отмена возвращает товар на склад в одной транзакции со сменой стадии
        const won = await this.stageRepository.compareAndSetStage({
            orderId: order.id,
            portalId,
            fromStageId: current?.id ?? null,
            toStageId: target.id,
            stagePosition: extra.stagePosition,
            restock: isFailureStage(target) ? stockLinesOf(order) : undefined,
        });
        if (!won) {
            throw new ConflictException(STAGE_RACE_MESSAGE);
        }

        const update: UpdateOrderInput = {};
        const lifecycleField = lifecycleFieldFor(target);
        if (lifecycleField && !order[lifecycleField]) {
            update[lifecycleField] = new Date();
        }
        if (extra.employeeId) update.employeeId = extra.employeeId;
        if (extra.adminNotes !== undefined) update.adminNotes = extra.adminNotes;

        const updated = await this.orderRepository.update(order.id, update);

        this.logger.log(
            `📋 Заказ ${order.orderNumber}: стадия ${current?.name ?? "—"} → ${target.name}` +
                (extra.employeeId ? ` (сотрудник: ${extra.employeeId})` : "")
        );

        return updated;
    }
}

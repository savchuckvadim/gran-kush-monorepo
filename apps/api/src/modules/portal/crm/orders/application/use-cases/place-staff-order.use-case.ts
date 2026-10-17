import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import type { PortalPrincipal } from "@common/portal";
import { principalCan } from "@common/portal";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { MemberAccessService } from "@modules/portal/crm/club-policy/application/services/member-access.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import {
    isFailureStage,
    lifecycleFieldFor,
} from "@modules/portal/crm/orders/domain/order-stage.rules";
import {
    OrderRepository,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { OrderStageRepository } from "@modules/portal/crm/orders/domain/repositories/order-stage-repository.interface";

import { NewOrderItem, OrderPlacementService } from "../services/order-placement.service";

export interface PlaceStaffOrderCommand {
    memberId: string;
    items: NewOrderItem[];
    notes?: string;
    stageId?: string;
}

/**
 * Сотрудник CRM оформляет заказ за участника: цену позиции можно поправить, позицию — отметить
 * подарком. Правила сценария:
 * - участник есть в клубе и активен;
 * - стадию нового заказа выбирает manager+ (то же право, что перевод стадии), и это не отмена —
 *   иначе склад бы не сошёлся;
 * - заказ на свою же запись участника — только если клуб это разрешил (`staffSelfOrders`);
 * - заказ, созданный сразу в стадии «готов» или «выдан», получает её метку времени.
 */
@Injectable()
export class PlaceStaffOrderUseCase {
    constructor(
        private readonly placement: OrderPlacementService,
        private readonly orderRepository: OrderRepository,
        private readonly stageRepository: OrderStageRepository,
        private readonly members: MembersService,
        private readonly memberAccess: MemberAccessService
    ) {}

    async execute(
        command: PlaceStaffOrderCommand,
        staff: Pick<PortalPrincipal, "membershipId" | "userId" | "permissions">,
        portalId: string
    ): Promise<Order> {
        if (command.stageId && !principalCan(staff, PERMISSIONS.OrdersProcess)) {
            throw new ForbiddenException(
                "Выбрать стадию нового заказа может тот, кто ведёт заказы"
            );
        }
        await this.memberAccess.assertStaffMayOrderFor(staff.userId, command.memberId, portalId);

        const member = await this.members.findByIdForPortal(command.memberId, portalId);
        if (!member) {
            throw new NotFoundException("Участник не найден");
        }
        if (!member.isActive) {
            throw new BadRequestException("Участник не активен");
        }

        const stage = command.stageId ? await this.openingStage(portalId, command.stageId) : null;

        const order = await this.placement.place(portalId, {
            memberId: command.memberId,
            items: command.items,
            notes: command.notes,
            employeeId: staff.membershipId,
            stageId: stage?.id,
        });

        const lifecycleField = stage ? lifecycleFieldFor(stage) : undefined;
        if (!lifecycleField) return order;
        const update: UpdateOrderInput = { [lifecycleField]: new Date() };
        return this.orderRepository.update(order.id, update);
    }

    /** Стадия, в которой заказ может появиться: из воронки этого клуба и не отмена. */
    private async openingStage(portalId: string, stageId: string): Promise<OrderStage> {
        const stage = await this.stageRepository.findStageInPortal(portalId, stageId);
        if (!stage) {
            throw new BadRequestException("Стадия не из воронки заказов этого клуба");
        }
        if (isFailureStage(stage)) {
            throw new BadRequestException("Нельзя создать заказ сразу в стадии отмены");
        }
        return stage;
    }
}

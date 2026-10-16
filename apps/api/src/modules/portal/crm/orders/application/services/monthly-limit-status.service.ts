import { Injectable } from "@nestjs/common";

import {
    MemberLimitService,
    MemberLimitSettings,
} from "@modules/portal/crm/club-policy/application/services/member-limit.service";
import {
    LIMIT_WINDOW_DAYS,
    limitWindowStart,
    remainingGrams,
} from "@modules/portal/crm/orders/domain/monthly-limit";
import { OrderRepository } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

export interface MonthlyLimitStatus extends MemberLimitSettings {
    usedGrams: number;
    remainingGrams: number | null;
    windowDays: number;
}

/**
 * Сколько участнику уже отпущено за последние 30 дней и сколько осталось — для кабинета и
 * карточки участника в CRM. Сам заказ проверяет лимит в своей транзакции, здесь — подсказка.
 */
@Injectable()
export class MonthlyLimitStatusService {
    constructor(
        private readonly memberLimits: MemberLimitService,
        private readonly orderRepository: OrderRepository
    ) {}

    async statusFor(memberId: string, portalId: string): Promise<MonthlyLimitStatus> {
        const settings = await this.memberLimits.settingsOf(memberId, portalId);
        const usedGrams = await this.orderRepository.sumLimitUsage(
            memberId,
            limitWindowStart(new Date())
        );
        return {
            ...settings,
            usedGrams,
            remainingGrams: remainingGrams(settings.limitGrams, usedGrams),
            windowDays: LIMIT_WINDOW_DAYS,
        };
    }

    /** Личный лимит (`null` — лимит клуба) и сразу новый статус для карточки. */
    async setPersonal(
        memberId: string,
        portalId: string,
        grams: number | null
    ): Promise<MonthlyLimitStatus> {
        await this.memberLimits.setPersonal(memberId, portalId, grams);
        return this.statusFor(memberId, portalId);
    }
}

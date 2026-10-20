import { Injectable } from "@nestjs/common";

import { PortalModulesService } from "@modules/portal/crm/portal-modules/application/portal-modules.service";

import { PRICES_INCLUDE_TAX_BY_DEFAULT } from "../../domain/organization/organization-profile";
import { OrganizationProfileRepository } from "../../domain/repositories/organization-profile-repository.interface";
import { TaxRateRepository } from "../../domain/repositories/tax-rate-repository.interface";
import { type LineTaxRule, splitLineTax } from "../../domain/tax/tax-split";

/** Налоговые поля товара, по которым считается его строка. */
export interface ProductTaxSettings {
    id: string;
    taxRateId: string | null;
    priceIncludesTax: boolean | null;
}

export interface PricedProductTaxSettings extends ProductTaxSettings {
    price: number;
}

/**
 * Как облагается товар клуба: ставка товара, иначе ставка по умолчанию; цена с налогом или
 * без — у товара, иначе в профиле организации. Пока финансы клуба выключены, налога нет: `null`,
 * заказ сохраняется без разбивки, витрина показывает цену как есть.
 */
@Injectable()
export class TaxPolicyService {
    constructor(
        private readonly modules: PortalModulesService,
        private readonly rates: TaxRateRepository,
        private readonly profiles: OrganizationProfileRepository
    ) {}

    /**
     * Правило налога каждого товара. `null` — разбивки нет: модуль выключен или у товара нет
     * ни своей ставки, ни ставки клуба по умолчанию (тогда без разбивки весь заказ).
     */
    async rulesFor(
        portalId: string,
        products: readonly ProductTaxSettings[]
    ): Promise<Map<string, LineTaxRule> | null> {
        if (!products.length || !(await this.modules.isEnabled(portalId, "finance"))) return null;
        const [rates, settings] = await Promise.all([
            this.rates.list(portalId, { includeArchived: true }),
            this.profiles.findTaxSettings(portalId),
        ]);
        const byId = new Map(rates.map((rate) => [rate.id, rate]));
        const fallback = rates.find((rate) => rate.isDefault && !rate.archivedAt);
        const pricesIncludeTax = settings?.pricesIncludeTax ?? PRICES_INCLUDE_TAX_BY_DEFAULT;

        const rules = new Map<string, LineTaxRule>();
        for (const product of products) {
            const rate = (product.taxRateId ? byId.get(product.taxRateId) : undefined) ?? fallback;
            if (!rate) return null;
            rules.set(product.id, {
                percent: rate.percent,
                treatment: rate.treatment,
                includesTax: product.priceIncludesTax ?? pricesIncludeTax,
            });
        }
        return rules;
    }

    /**
     * Цена единицы для покупателя — всегда с налогом: у товара «налог сверху» налог прибавлен.
     * Без разбивки (финансы выключены) — цена как есть.
     */
    async grossPrices(
        portalId: string,
        products: readonly PricedProductTaxSettings[]
    ): Promise<Map<string, number>> {
        const rules = await this.rulesFor(portalId, products);
        return new Map(
            products.map((product) => {
                const rule = rules?.get(product.id);
                return [product.id, rule ? splitLineTax(product.price, rule).gross : product.price];
            })
        );
    }
}

import { Injectable } from "@nestjs/common";

import {
    BillingPlanCatalogItem,
    BillingPlanRepository,
} from "@modules/billing/domain/repositories/billing-plan-repository.interface";

@Injectable()
export class BillingPlansService {
    constructor(private readonly billingPlans: BillingPlanRepository) {}

    listCatalog(): Promise<BillingPlanCatalogItem[]> {
        return this.billingPlans.findActivePlansForCatalog();
    }
}

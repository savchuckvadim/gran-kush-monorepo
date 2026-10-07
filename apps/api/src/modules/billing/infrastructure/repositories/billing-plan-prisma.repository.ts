import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    BillingPlanCatalogItem,
    BillingPlanFeatures,
    BillingPlanRepository,
} from "@modules/billing/domain/repositories/billing-plan-repository.interface";

const billingPlanCatalogSelect = {
    code: true,
    name: true,
    priceAmount: true,
    currency: true,
    interval: true,
    featuresJson: true,
} as const;

type BillingPlanCatalogRow = Prisma.BillingPlanGetPayload<{
    select: typeof billingPlanCatalogSelect;
}>;

@Injectable()
export class BillingPlanPrismaRepository implements BillingPlanRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findActivePlansForCatalog(): Promise<BillingPlanCatalogItem[]> {
        const rows = await this.prisma.billingPlan.findMany({
            where: { isActive: true },
            select: billingPlanCatalogSelect,
            orderBy: [{ priceAmount: "asc" }, { code: "asc" }],
        });
        return rows.map((row) => this.toCatalogItem(row));
    }

    private toCatalogItem(row: BillingPlanCatalogRow): BillingPlanCatalogItem {
        return {
            code: row.code,
            name: row.name,
            priceAmount: row.priceAmount.toFixed(2),
            currency: row.currency,
            interval: row.interval,
            features: this.toFeatures(row.featuresJson),
        };
    }

    /**
     * `featuresJson` — JSONB без схемы на стороне БД. Наружу идут только булевы флаги:
     * иначе тип `Record<string, boolean>` обещал бы то, чего в строке может не оказаться.
     */
    private toFeatures(json: Prisma.JsonValue): BillingPlanFeatures {
        if (json === null || typeof json !== "object" || Array.isArray(json)) {
            return {};
        }
        const features: BillingPlanFeatures = {};
        for (const [key, value] of Object.entries(json)) {
            if (typeof value === "boolean") {
                features[key] = value;
            }
        }
        return features;
    }
}

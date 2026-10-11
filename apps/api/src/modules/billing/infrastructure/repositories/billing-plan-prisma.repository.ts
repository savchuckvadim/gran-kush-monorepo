import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    BillingPlanCatalogItem,
    BillingPlanCreateInput,
    BillingPlanFeatures,
    BillingPlanRepository,
    BillingPlanUpdateInput,
    BillingPlanView,
} from "@modules/billing/domain/repositories/billing-plan-repository.interface";

const billingPlanCatalogSelect = {
    code: true,
    name: true,
    priceAmount: true,
    currency: true,
    interval: true,
    featuresJson: true,
} as const;

const billingPlanViewSelect = {
    ...billingPlanCatalogSelect,
    id: true,
    isActive: true,
    isPublic: true,
    stripePriceId: true,
} as const;

type BillingPlanCatalogRow = Prisma.BillingPlanGetPayload<{
    select: typeof billingPlanCatalogSelect;
}>;

type BillingPlanViewRow = Prisma.BillingPlanGetPayload<{
    select: typeof billingPlanViewSelect;
}>;

@Injectable()
export class BillingPlanPrismaRepository implements BillingPlanRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findActivePlansForCatalog(): Promise<BillingPlanCatalogItem[]> {
        const rows = await this.prisma.billingPlan.findMany({
            where: { isActive: true, isPublic: true },
            select: billingPlanCatalogSelect,
            orderBy: [{ priceAmount: "asc" }, { code: "asc" }],
        });
        return rows.map((row) => this.toCatalogItem(row));
    }

    async findAll(): Promise<BillingPlanView[]> {
        const rows = await this.prisma.billingPlan.findMany({
            select: billingPlanViewSelect,
            orderBy: [{ isActive: "desc" }, { priceAmount: "asc" }, { code: "asc" }],
        });
        return rows.map((row) => this.toView(row));
    }

    async findByCode(code: string): Promise<BillingPlanView | null> {
        const row = await this.prisma.billingPlan.findUnique({
            where: { code },
            select: billingPlanViewSelect,
        });
        return row ? this.toView(row) : null;
    }

    async findByStripePriceId(stripePriceId: string): Promise<BillingPlanView | null> {
        const row = await this.prisma.billingPlan.findUnique({
            where: { stripePriceId },
            select: billingPlanViewSelect,
        });
        return row ? this.toView(row) : null;
    }

    async create(input: BillingPlanCreateInput): Promise<BillingPlanView> {
        const row = await this.prisma.billingPlan.create({
            data: {
                code: input.code,
                name: input.name,
                priceAmount: new Prisma.Decimal(input.priceAmount),
                currency: input.currency,
                interval: input.interval,
                featuresJson: input.features,
                isActive: input.isActive,
                isPublic: input.isPublic,
                stripePriceId: input.stripePriceId,
            },
            select: billingPlanViewSelect,
        });
        return this.toView(row);
    }

    async update(code: string, input: BillingPlanUpdateInput): Promise<BillingPlanView> {
        const row = await this.prisma.billingPlan.update({
            where: { code },
            data: {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.priceAmount !== undefined
                    ? { priceAmount: new Prisma.Decimal(input.priceAmount) }
                    : {}),
                ...(input.currency !== undefined ? { currency: input.currency } : {}),
                ...(input.interval !== undefined ? { interval: input.interval } : {}),
                ...(input.features !== undefined ? { featuresJson: input.features } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
                ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
                ...(input.stripePriceId !== undefined
                    ? { stripePriceId: input.stripePriceId }
                    : {}),
            },
            select: billingPlanViewSelect,
        });
        return this.toView(row);
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

    private toView(row: BillingPlanViewRow): BillingPlanView {
        return {
            ...this.toCatalogItem(row),
            id: row.id,
            isActive: row.isActive,
            isPublic: row.isPublic,
            stripePriceId: row.stripePriceId,
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

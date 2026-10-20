import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { employeeActor, type OutboxTransaction } from "@modules/events";

import {
    CATEGORY_ERRORS,
    categoryCodeFrom,
    categoryPresetsFor,
    type FinanceCategory,
    ORDER_SALE_CATEGORY,
} from "../../domain/ledger/finance-category";
import {
    type FinanceCategoryChange,
    FinanceCategoryRepository,
    type NewFinanceCategory,
} from "../../domain/repositories/finance-category-repository.interface";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import { categoriesChangedEvent } from "../events/ledger-events";

/** Сколько раз подбирать свободный код статьи: `rent`, `rent_2`… Совпадений больше — ошибка ввода. */
const CODE_ATTEMPTS = 20;

/**
 * Статьи доходов и расходов клуба. Пресет по типу портала появляется при включении финансов;
 * свои статьи — `finance.admin`. Статья, в которую идут оплаченные заказы, в архив не уходит.
 */
@Injectable()
export class FinanceCategoriesService {
    constructor(
        private readonly repository: FinanceCategoryRepository,
        private readonly directory: FinanceDirectory
    ) {}

    list(portalId: string, includeArchived: boolean): Promise<FinanceCategory[]> {
        return this.repository.list(portalId, { includeArchived });
    }

    async findActive(portalId: string, id: string): Promise<FinanceCategory | null> {
        const category = await this.repository.findById(portalId, id);
        return category && !category.archivedAt ? category : null;
    }

    /** Статья оплат заказов; пресета ещё нет (финансы включили до TASK-798) — досоздаёт. */
    async orderSaleCategory(portalId: string): Promise<FinanceCategory | null> {
        const found = await this.repository.findByCode(portalId, ORDER_SALE_CATEGORY);
        if (found) return found;
        await this.seedPresets(portalId);
        return this.repository.findByCode(portalId, ORDER_SALE_CATEGORY);
    }

    async seedPresets(portalId: string, tx?: OutboxTransaction): Promise<void> {
        const type = await this.directory.portalType(portalId);
        if (type) await this.repository.seedPresets(portalId, categoryPresetsFor(type), tx);
    }

    async create(
        portalId: string,
        input: Omit<NewFinanceCategory, "code">,
        employeeId: string
    ): Promise<FinanceCategory> {
        const name = input.name.trim();
        if (!name) {
            throw new BadRequestException({
                message: "Category name is required",
                code: CATEGORY_ERRORS.nameRequired,
            });
        }
        const code = await this.freeCode(portalId, categoryCodeFrom(name));
        return this.repository.create(portalId, { ...input, name, code }, (created) => [
            categoriesChangedEvent(portalId, created.id, "created", employeeActor(employeeId)),
        ]);
    }

    async update(
        portalId: string,
        id: string,
        change: FinanceCategoryChange,
        employeeId: string
    ): Promise<FinanceCategory> {
        await this.findOrFail(portalId, id);
        const name = change.name === undefined ? undefined : change.name?.trim() || null;
        return this.repository.update(portalId, id, { ...change, name }, [
            categoriesChangedEvent(portalId, id, "updated", employeeActor(employeeId)),
        ]);
    }

    async archive(portalId: string, id: string, employeeId: string): Promise<void> {
        const category = await this.findOrFail(portalId, id);
        if (category.archivedAt) return;
        if (category.code === ORDER_SALE_CATEGORY) {
            throw new ConflictException({
                message: "Paid orders are recorded in this category",
                code: CATEGORY_ERRORS.receivesOrders,
            });
        }
        await this.repository.archive(portalId, id, [
            categoriesChangedEvent(portalId, id, "archived", employeeActor(employeeId)),
        ]);
    }

    private async findOrFail(portalId: string, id: string): Promise<FinanceCategory> {
        const category = await this.repository.findById(portalId, id);
        if (!category) throw new NotFoundException("Category not found");
        return category;
    }

    private async freeCode(portalId: string, base: string): Promise<string> {
        for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt += 1) {
            const code = attempt === 1 ? base : `${base}_${attempt}`;
            if (!(await this.repository.findByCode(portalId, code))) return code;
        }
        throw new ConflictException({
            message: "Too many categories with this name",
            code: CATEGORY_ERRORS.codeTaken,
        });
    }
}

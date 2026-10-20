import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import type { VatRegime } from "@prisma/client";

import { employeeActor, type NewDomainEvent, type OutboxTransaction } from "@modules/events";

import {
    type NewTaxRate,
    type TaxRateChange,
    TaxRateRepository,
} from "../../domain/repositories/tax-rate-repository.interface";
import {
    defaultPresetCode,
    ES_TAX_RATE_PRESETS,
    percentFor,
    TAX_RATE_ERRORS,
    type TaxRate,
} from "../../domain/tax/tax-rate";

type TaxRateChangeKind = "created" | "updated" | "archived" | "default_changed";

/**
 * Ставки налога клуба (TASK-797): пресет Испании при включении финансов, свои ставки владельца.
 *
 * - у exenta и no sujeta процент всегда 0;
 * - ставка по умолчанию одна; её нельзя архивировать — сначала выбрать другую;
 * - ставку, на которую ссылаются товары, архивировать нельзя: товар молча не сменит налог;
 * - ставки не удаляются: заказы хранят снимок процента, архив нужен для истории;
 * - у своей ставки есть имя; у пресета имя необязательно — подпись переводит CRM по коду.
 */
@Injectable()
export class TaxRatesService {
    constructor(private readonly repository: TaxRateRepository) {}

    list(portalId: string, includeArchived = false): Promise<TaxRate[]> {
        return this.repository.list(portalId, { includeArchived });
    }

    create(portalId: string, input: NewTaxRate, employeeId: string): Promise<TaxRate> {
        const rate = { ...input, percent: percentFor(input.treatment, input.percent) };
        return this.repository.create(portalId, rate, (created) => [
            this.changed(portalId, employeeId, created.id, "created"),
        ]);
    }

    async update(
        portalId: string,
        id: string,
        change: TaxRateChange,
        employeeId: string
    ): Promise<TaxRate> {
        const current = await this.usable(portalId, id);
        if (change.name === null && !current.presetCode) {
            throw new BadRequestException({
                message: "A custom tax rate needs a name",
                code: TAX_RATE_ERRORS.nameRequired,
            });
        }
        const treatment = change.treatment ?? current.treatment;
        const percent = percentFor(treatment, change.percent ?? current.percent);
        return this.repository.update(portalId, id, { ...change, treatment, percent }, [
            this.changed(portalId, employeeId, id, "updated"),
        ]);
    }

    async makeDefault(portalId: string, id: string, employeeId: string): Promise<void> {
        const rate = await this.usable(portalId, id);
        if (rate.isDefault) return;
        await this.repository.makeDefault(portalId, id, [
            this.changed(portalId, employeeId, id, "default_changed"),
        ]);
    }

    async archive(portalId: string, id: string, employeeId: string): Promise<void> {
        const rate = await this.usable(portalId, id);
        if (rate.isDefault) {
            throw new ConflictException({
                message: "The default tax rate cannot be archived",
                code: TAX_RATE_ERRORS.isDefault,
            });
        }
        const products = await this.repository.countProducts(portalId, id);
        if (products > 0) {
            throw new ConflictException({
                message: "Products still use this tax rate",
                code: TAX_RATE_ERRORS.inUse,
                products,
            });
        }
        await this.repository.archive(portalId, id, [
            this.changed(portalId, employeeId, id, "archived"),
        ]);
    }

    /** Ставка клуба, на которую может сослаться товар: своя и не в архиве. */
    async usable(portalId: string, id: string): Promise<TaxRate> {
        const rate = await this.repository.findById(portalId, id);
        if (!rate) throw new NotFoundException("Tax rate not found");
        if (rate.archivedAt) {
            throw new BadRequestException({
                message: "The tax rate is archived",
                code: TAX_RATE_ERRORS.archived,
            });
        }
        return rate;
    }

    /** Пресет Испании в транзакции включения модуля; по умолчанию — ставка режима IVA. */
    seedPresets(portalId: string, vatRegime: VatRegime, tx: OutboxTransaction): Promise<void> {
        return this.repository.seedPresets(
            portalId,
            ES_TAX_RATE_PRESETS,
            defaultPresetCode(vatRegime),
            tx
        );
    }

    /**
     * Режим IVA сменился: ставкой по умолчанию становится его пресет (освобождённой организации —
     * exenta, остальным — general), если пресет не в архиве.
     */
    async useRegimeDefault(
        portalId: string,
        vatRegime: VatRegime,
        employeeId: string
    ): Promise<void> {
        const code = defaultPresetCode(vatRegime);
        const preset = (await this.repository.list(portalId, { includeArchived: false })).find(
            (rate) => rate.presetCode === code
        );
        if (!preset || preset.isDefault) return;
        await this.repository.makeDefault(portalId, preset.id, [
            this.changed(portalId, employeeId, preset.id, "default_changed"),
        ]);
    }

    private changed(
        portalId: string,
        employeeId: string,
        taxRateId: string,
        change: TaxRateChangeKind
    ): NewDomainEvent {
        return {
            name: "finance.tax_rates_changed",
            portalId,
            actor: employeeActor(employeeId),
            aggregateId: portalId,
            payload: { taxRateId, change },
        };
    }
}

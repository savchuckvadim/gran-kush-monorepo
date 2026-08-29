import { MeasurementUnit } from "@modules/portal/crm/catalog/domain/entity/measurement-unit.entity";

/**
 * `portalId` — обязательный первый аргумент каждого метода, а не поле необязательного
 * объекта фильтров: фильтр можно забыть передать, аргумент — нет. То же правило, что
 * в финансах после TASK-103a.
 */
export abstract class MeasurementUnitRepository {
    abstract findById(portalId: string, id: string): Promise<MeasurementUnit | null>;
    abstract findByCode(portalId: string, code: string): Promise<MeasurementUnit | null>;
    abstract findAll(portalId: string, onlyActive?: boolean): Promise<MeasurementUnit[]>;
    abstract count(portalId: string): Promise<number>;
    abstract create(
        portalId: string,
        data: {
            code: string;
            name: string;
            description?: string;
            isCustom?: boolean;
        }
    ): Promise<MeasurementUnit>;
    /** Возвращает `null`, если единицы с таким id в этом портале нет. */
    abstract update(
        portalId: string,
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            isCustom: boolean;
            isActive: boolean;
        }>
    ): Promise<MeasurementUnit | null>;
    /** `false`, если единицы с таким id в этом портале нет. */
    abstract delete(portalId: string, id: string): Promise<boolean>;
}

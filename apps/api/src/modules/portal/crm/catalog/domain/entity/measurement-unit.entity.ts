/**
 * Domain Entity — MeasurementUnit (Единица измерения)
 */
export class MeasurementUnit {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    isCustom: boolean;
    /** Весовая: при скане товара количество вводят, а не ставят 1 */
    isWeighed: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<MeasurementUnit>) {
        Object.assign(this, partial);
    }
}

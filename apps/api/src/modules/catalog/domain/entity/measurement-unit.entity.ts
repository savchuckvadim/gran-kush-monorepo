/**
 * Domain Entity — MeasurementUnit (Единица измерения)
 */
export class MeasurementUnit {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    isCustom: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<MeasurementUnit>) {
        Object.assign(this, partial);
    }
}

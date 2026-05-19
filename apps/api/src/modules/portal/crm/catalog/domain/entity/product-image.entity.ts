/**
 * Domain Entity — ProductImage (Изображение товара)
 */
export class ProductImage {
    id: string;
    productId: string;
    storagePath: string;
    sortOrder: number;
    isPrimary: boolean;
    createdAt: Date;

    constructor(partial: Partial<ProductImage>) {
        Object.assign(this, partial);
    }
}

export interface MemberSearchHit {
    id: string;
    name: string;
    membershipNumber: string | null;
    email: string;
}

export interface ProductSearchHit {
    id: string;
    name: string;
    sku: string | null;
}

export interface OrderSearchHit {
    id: string;
    orderNumber: string;
    memberName: string;
    orderedAt: Date;
}

export abstract class CrmSearchRepository {
    /** Подстрока в имени, фамилии, телефоне, номере участника или email. */
    abstract searchMembers(
        portalId: string,
        query: string,
        limit: number
    ): Promise<MemberSearchHit[]>;

    /** Подстрока в названии или SKU. */
    abstract searchProducts(
        portalId: string,
        query: string,
        limit: number
    ): Promise<ProductSearchHit[]>;

    /** Подстрока в номере заказа. */
    abstract searchOrders(
        portalId: string,
        query: string,
        limit: number
    ): Promise<OrderSearchHit[]>;
}

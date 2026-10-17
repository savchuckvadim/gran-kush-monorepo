import { Injectable } from "@nestjs/common";

import {
    CrmSearchRepository,
    MemberSearchHit,
    OrderSearchHit,
    ProductSearchHit,
} from "@modules/portal/crm/search/domain/repositories/crm-search-repository.interface";

const DEFAULT_LIMIT = 5;

export interface CrmSearchResult {
    members: MemberSearchHit[];
    products: ProductSearchHit[];
    orders: OrderSearchHit[];
}

/** Какие разделы ищем: участников и заказы — только с правом их читать (TASK-731). */
export interface CrmSearchScope {
    members: boolean;
    orders: boolean;
}

/** Быстрый поиск по клубу для палитры Ctrl K: участники, товары, заказы. */
@Injectable()
export class CrmSearchService {
    constructor(private readonly search: CrmSearchRepository) {}

    async searchAll(
        portalId: string,
        query: string,
        scope: CrmSearchScope,
        limit = DEFAULT_LIMIT
    ): Promise<CrmSearchResult> {
        const q = query.trim();
        const [members, products, orders] = await Promise.all([
            scope.members ? this.search.searchMembers(portalId, q, limit) : [],
            this.search.searchProducts(portalId, q, limit),
            scope.orders ? this.search.searchOrders(portalId, q, limit) : [],
        ]);
        return { members, products, orders };
    }
}

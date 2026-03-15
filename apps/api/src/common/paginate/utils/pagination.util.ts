import { PaginatedResult } from "../interfaces/paginated-result.interface";

export class PaginationUtil {
    static createPaginatedResult<T>(
        items: T[],
        total: number,
        page: number,
        limit: number
    ): PaginatedResult<T> {
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static getSkip(page: number, limit: number): number {
        return (page - 1) * limit;
    }
}

import { ProductAudience } from "@prisma/client";

import { audiencesFromFlags, isVisibleTo } from "../domain/product-audience";

describe("product audiences", () => {
    it("a product without audiences is for every member", () => {
        expect(isVisibleTo([], [])).toBe(true);
        expect(isVisibleTo([], [ProductAudience.medical])).toBe(true);
    });

    it("a product with audiences is for members of at least one of them", () => {
        const product = [ProductAudience.medical, ProductAudience.mj];
        expect(isVisibleTo(product, [])).toBe(false);
        expect(isVisibleTo(product, [ProductAudience.recreation])).toBe(false);
        expect(isVisibleTo(product, [ProductAudience.mj])).toBe(true);
    });

    it("the member's audiences come from the flags the club ticked", () => {
        expect(audiencesFromFlags(["is_medical", "is_recreation", "first_name"])).toEqual([
            ProductAudience.medical,
            ProductAudience.recreation,
        ]);
        expect(audiencesFromFlags([])).toEqual([]);
    });
});

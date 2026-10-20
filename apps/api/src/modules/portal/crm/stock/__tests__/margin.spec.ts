import { marginReport } from "../domain/margin";

const line = (productId: string, revenue: number, cost: number | null, quantity = 1) => ({
    productId,
    productName: productId,
    categoryId: "c",
    categoryName: "Flores",
    quantity,
    revenue,
    cost,
});

describe("отчёт по марже", () => {
    it("складывает строки по товару, считает маржу и процент, убыточные снизу", () => {
        const report = marginReport([
            line("a", 1000, 400),
            line("a", 1000, 500, 2),
            line("b", 500, 700),
        ]);
        expect(report.byProduct.map((row) => row.productId)).toEqual(["a", "b"]);
        expect(report.byProduct[0]).toMatchObject({
            quantity: 3,
            revenue: 2000,
            cost: 900,
            margin: 1100,
            marginPercent: 55,
        });
        expect(report.byProduct[1]).toMatchObject({ margin: -200, marginPercent: -40 });
        expect(report).toMatchObject({
            revenue: 2500,
            cost: 1600,
            margin: 900,
            revenueWithoutCost: 0,
        });
    });

    it("строки без себестоимости не портят итог и показаны отдельно", () => {
        const report = marginReport([
            line("a", 1000, 400),
            line("b", 300, null),
            line("b", 200, 50),
        ]);
        expect(report.byProduct.find((row) => row.productId === "b")).toMatchObject({
            cost: null,
            margin: null,
            marginPercent: null,
        });
        expect(report).toMatchObject({
            revenue: 1000,
            cost: 400,
            margin: 600,
            revenueWithoutCost: 500,
        });
    });
});

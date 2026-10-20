import { averageCostAfterPurchase, roundCost, roundQuantity } from "../domain/stock-move";

describe("себестоимость склада", () => {
    it("средневзвешенная после прихода: остаток по старой цене плюс партия по новой", () => {
        // 10 шт по 4 € + 10 шт по 6 € = 100 € за 20 шт
        expect(averageCostAfterPurchase(10, 4, 10, 6)).toBe(5);
        // 30 г по 5 € + 10 г по 9 € = 240 € за 40 г
        expect(averageCostAfterPurchase(30, 5, 10, 9)).toBe(6);
        expect(averageCostAfterPurchase(3, 0.0833, 1, 0.1)).toBe(0.0875);
    });

    it("первая поставка и поставка в пустой или ушедший в минус склад задают цену партии", () => {
        expect(averageCostAfterPurchase(0, null, 10, 4.5)).toBe(4.5);
        expect(averageCostAfterPurchase(0, 3, 10, 4.5)).toBe(4.5);
        expect(averageCostAfterPurchase(-2, 3, 10, 4.5)).toBe(4.5);
    });

    it("округление: цена до четырёх знаков, количество до трёх", () => {
        expect(roundCost(1 / 3)).toBe(0.3333);
        expect(roundQuantity(2.0005)).toBe(2.001);
        expect(roundQuantity(2.0004)).toBe(2);
    });
});

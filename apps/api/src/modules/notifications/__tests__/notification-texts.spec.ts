import {
    renderNotification,
    telegramLocale,
} from "@modules/notifications/domain/notification-texts";

describe("тексты уведомлений для Telegram", () => {
    it("язык Telegram сводится к нашим, незнакомый — испанский", () => {
        expect(telegramLocale("ru")).toBe("ru");
        expect(telegramLocale("en-GB")).toBe("en");
        expect(telegramLocale("uk")).toBe("es");
        expect(telegramLocale(null)).toBe("es");
    });

    it("стадия — словом клуба на языке получателя; незнакомый тип — без текста", () => {
        const params = {
            orderNumber: "ORD-7",
            club: "Club Sol",
            stage: { label: "Готов", labelI18n: { es: "Listo" } },
        };
        expect(renderNotification("order.stage_changed", params, "es")).toBe(
            "📦 Club Sol: pedido ORD-7 — Listo"
        );
        expect(renderNotification("order.stage_changed", params, "ru")).toBe(
            "📦 Club Sol: заказ ORD-7 — Готов"
        );
        expect(renderNotification("order.refunded", params, "ru")).toBeNull();
    });
});

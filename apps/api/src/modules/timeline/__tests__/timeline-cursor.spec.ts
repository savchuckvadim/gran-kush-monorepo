import {
    decodeCursor,
    encodeCursor,
    newerFirst,
    type TimelineEntry,
} from "@modules/timeline/domain/timeline";

const comment = (id: string, at: string): TimelineEntry => ({
    kind: "comment",
    id,
    at: new Date(at),
    comment: {
        id,
        body: "x",
        author: null,
        pinnedAt: null,
        editedAt: null,
        createdAt: new Date(at),
    },
});

describe("таймлайн: курсор и порядок", () => {
    it("курсор хранит время и id и читается обратно; мусор — как первая страница", () => {
        const cursor = { at: new Date("2026-10-20T10:00:00.123Z"), id: "b2" };
        expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
        expect(decodeCursor("not-a-cursor")).toBeNull();
        expect(decodeCursor(undefined)).toBeNull();
    });

    it("новые сверху; при равном времени — по id, как сортирует база", () => {
        const same = "2026-10-20T10:00:00.000Z";
        const sorted = [
            comment("a1", same),
            comment("c3", "2026-10-20T11:00:00.000Z"),
            comment("b2", same),
        ].sort(newerFirst);
        expect(sorted.map((entry) => entry.id)).toEqual(["c3", "b2", "a1"]);
    });
});

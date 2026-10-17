import { StagePositionService } from "@modules/portal/crm/records/application/services/stage-position.service";
import { StagePositionRepository } from "@modules/portal/crm/records/domain/repositories/stage-position.repository";
import {
    STAGE_POSITION_STEP,
    type StageColumn,
} from "@modules/portal/crm/records/domain/stage-position";

const COLUMN: StageColumn = {
    portalId: "portal-a",
    entityDefinitionId: "def-1",
    stageId: "stage-1",
};
const NOW = new Date("2026-10-17T12:00:00.000Z");

/** Колонка в памяти: id → позиция; перенумерация — как в SQL, равным шагом от верхней. */
class InMemoryPositions extends StagePositionRepository {
    renumbered = 0;

    constructor(readonly cards: Map<string, number>) {
        super();
    }

    private others(exceptId: string): number[] {
        return [...this.cards].filter(([id]) => id !== exceptId).map(([, pos]) => pos);
    }

    positionOf(_column: StageColumn, recordId: string): Promise<number | null> {
        return Promise.resolve(this.cards.get(recordId) ?? null);
    }

    topOf(_column: StageColumn, exceptId: string): Promise<number | null> {
        const rest = this.others(exceptId);
        return Promise.resolve(rest.length ? Math.min(...rest) : null);
    }

    nextBelow(_column: StageColumn, position: number, exceptId: string): Promise<number | null> {
        const below = this.others(exceptId).filter((pos) => pos > position);
        return Promise.resolve(below.length ? Math.min(...below) : null);
    }

    renumber(): Promise<void> {
        this.renumbered += 1;
        const sorted = [...this.cards].sort((a, b) => a[1] - b[1]);
        const low = sorted[0][1];
        const high = sorted[sorted.length - 1][1];
        const step = Math.max((high - low) / Math.max(sorted.length - 1, 1), STAGE_POSITION_STEP);
        sorted.forEach(([id], index) => this.cards.set(id, low + index * step));
        return Promise.resolve();
    }
}

const setup = (cards: Record<string, number>) => {
    const repository = new InMemoryPositions(new Map(Object.entries(cards)));
    return { repository, service: new StagePositionService(repository) };
};

describe("StagePositionService — место карточки в колонке", () => {
    it("наверх: выше верхней карточки и не ниже «сейчас»", async () => {
        const { service } = setup({ a: -100, b: -50 });
        await expect(service.positionFor(COLUMN, "x", null, NOW)).resolves.toBe(-NOW.getTime());

        const fresh = setup({ a: -NOW.getTime() + 5 });
        await expect(fresh.service.positionFor(COLUMN, "x", null, NOW)).resolves.toBe(
            -NOW.getTime()
        );

        const ahead = setup({ a: -NOW.getTime() - 10 });
        await expect(ahead.service.positionFor(COLUMN, "x", null, NOW)).resolves.toBe(
            -NOW.getTime() - 10 - STAGE_POSITION_STEP
        );
    });

    it("под соседом: середина до следующей карточки", async () => {
        const { service } = setup({ a: 10, b: 20, x: 5 });
        await expect(service.positionFor(COLUMN, "x", "a", NOW)).resolves.toBe(15);
    });

    it("под нижней: на шаг ниже", async () => {
        const { service } = setup({ a: 10, b: 20 });
        await expect(service.positionFor(COLUMN, "x", "b", NOW)).resolves.toBe(
            20 + STAGE_POSITION_STEP
        );
    });

    it("сама карточка не мешает: перестановка на шаг вниз в той же колонке", async () => {
        const { service } = setup({ x: 10, a: 20, b: 30 });
        await expect(service.positionFor(COLUMN, "x", "a", NOW)).resolves.toBe(25);
    });

    it("места не осталось — колонка перенумеровывается, порядок сохраняется", async () => {
        const above = 1_000_000_000_000;
        // соседние double: между ними нет ни одного числа
        const below = above + 2 ** -13;
        const { service, repository } = setup({ a: above, b: below, c: above + 3 });

        const position = await service.positionFor(COLUMN, "x", "a", NOW);

        expect(repository.renumbered).toBe(1);
        const a = repository.cards.get("a") ?? NaN;
        const b = repository.cards.get("b") ?? NaN;
        expect(position).toBeGreaterThan(a);
        expect(position).toBeLessThan(b);
    });

    it("сосед ушёл из колонки — наверх", async () => {
        const { service } = setup({ a: -100 });
        await expect(service.positionFor(COLUMN, "x", "gone", NOW)).resolves.toBe(-NOW.getTime());
    });
});

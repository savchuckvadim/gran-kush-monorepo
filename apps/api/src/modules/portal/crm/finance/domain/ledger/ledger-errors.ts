/** Месяц проводки закрыт: запись не прошла, исправлять — сторно в открытом месяце. */
export class ClosedPeriodError extends Error {
    constructor(readonly period: string) {
        super(`Finance period ${period} is closed`);
    }
}

import { withMinDuration } from "./min-duration.util";

describe("withMinDuration", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("holds a fast result until the floor", async () => {
        let settled = false;
        const pending = withMinDuration(400, () => Promise.resolve("ok")).then((value) => {
            settled = true;
            return value;
        });

        await jest.advanceTimersByTimeAsync(399);
        expect(settled).toBe(false);
        await jest.advanceTimersByTimeAsync(1);
        await expect(pending).resolves.toBe("ok");
    });

    it("does not delay work that is already slower than the floor", async () => {
        const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve("late"), 500));
        const pending = withMinDuration(400, slow);

        await jest.advanceTimersByTimeAsync(500);
        await expect(pending).resolves.toBe("late");
    });

    it("keeps the floor when the work fails", async () => {
        let settled = false;
        const pending = withMinDuration(400, () => Promise.reject(new Error("boom"))).catch(
            (error: Error) => {
                settled = true;
                return error.message;
            }
        );

        await jest.advanceTimersByTimeAsync(399);
        expect(settled).toBe(false);
        await jest.advanceTimersByTimeAsync(1);
        await expect(pending).resolves.toBe("boom");
    });
});

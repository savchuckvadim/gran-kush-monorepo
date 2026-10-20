/** Сегодня по часам устройства, `YYYY-MM-DD`: дата новой проводки по умолчанию. */
export const localToday = (now = new Date()): string =>
    [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

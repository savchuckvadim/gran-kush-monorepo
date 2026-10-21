/**
 * Выполняет `work` и возвращает результат не раньше чем через `minMs`. Публичный запрос, который для
 * известного адреса делает больше работы (выписать ссылку, поставить письмо), так не выдаёт этого
 * временем ответа: обе ветки отвечают за одно и то же время, пока работа укладывается в порог.
 */
export const withMinDuration = async <T>(minMs: number, work: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    try {
        return await work();
    } finally {
        const left = minMs - (Date.now() - startedAt);
        if (left > 0) {
            await new Promise((resolve) => setTimeout(resolve, left));
        }
    }
};

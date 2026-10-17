import { ApiAuthType, REFRESH_PATH } from "./api-auth.type";

/**
 * Обновление сессии идёт по одному запросу на тип клиента. Общий для всех клиентов промис не
 * годится: кабинет участника и CRM живут в одном приложении, и 401 у одного ждал бы refresh другого
 * (а то и получал его результат вместо своего).
 */
const refreshPromises = new Map<ApiAuthType, Promise<void>>();

/** Код 401 API: этот refresh-токен только что обновила соседняя вкладка (AUTH_ARCHITECTURE §3.3). */
const REFRESH_SUPERSEDED = "refresh_superseded";
/**
 * Сколько ждать ответа выигравшей вкладки: её Set-Cookie может прийти в браузер позже нашего 401,
 * а повтор запроса со старой access-кукой снова получил бы 401.
 */
const SUPERSEDED_SETTLE_MS = 300;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Соседняя вкладка уже обновила куки — это успех, а не конец сессии. */
const isSuperseded = async (response: Response): Promise<boolean> => {
    if (response.status !== 401) return false;
    try {
        const body = (await response.clone().json()) as { code?: unknown };
        return body.code === REFRESH_SUPERSEDED;
    } catch {
        return false;
    }
};

/**
 * Refresh сессии по HttpOnly-куке (`POST /{aud}/auth/refresh`, тело не нужно). Токены в JS не
 * попадают никогда: веб-клиент живёт только на куках.
 */
export class ApiRefreshHelper {
    private readonly refreshUrl: string;

    constructor(
        private readonly type: ApiAuthType,
        baseurl: string
    ) {
        this.refreshUrl = `${baseurl}${REFRESH_PATH[type]}`;
    }

    /** Завершает обновление (или бросает): вызывающий ждёт его, прежде чем повторить запрос. */
    public async makeToken(): Promise<void> {
        let refreshPromise = refreshPromises.get(this.type);
        if (!refreshPromise) {
            // finally в той же цепочке: отдельный `refreshPromise.finally()` никто не ловил,
            // и неудачный refresh всплывал в консоли необработанным reject
            refreshPromise = (async () => {
                const response = await fetch(this.refreshUrl, {
                    method: "POST",
                    credentials: "include",
                });
                if (await isSuperseded(response)) {
                    await sleep(SUPERSEDED_SETTLE_MS);
                    return;
                }
                if (!response.ok) {
                    throw new Error("Failed to refresh the session");
                }
            })().finally(() => {
                refreshPromises.delete(this.type);
            });
            refreshPromises.set(this.type, refreshPromise);
        }

        await refreshPromise;
    }
}

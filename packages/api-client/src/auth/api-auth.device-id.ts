const DEVICE_ID_STORAGE_KEY = "api_device_id";

let inMemoryDeviceId: string | null = null;

const randomId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Стабильный id устройства для `X-Device-Id`: сервер держит одну сессию на устройство и
 * приложение, новый вход с того же браузера заменяет прежнюю. Без заголовка каждый вход — новое устройство.
 * Это не секрет — просто ярлык браузера; живёт в localStorage.
 */
export const getOrCreateDeviceId = (): string | null => {
    if (typeof window === "undefined") {
        return null;
    }
    if (inMemoryDeviceId) {
        return inMemoryDeviceId;
    }
    try {
        const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
        if (stored) {
            inMemoryDeviceId = stored;
            return stored;
        }
        const created = randomId();
        window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
        inMemoryDeviceId = created;
        return created;
    } catch {
        // Приватный режим без localStorage: id живёт до перезагрузки страницы
        inMemoryDeviceId = inMemoryDeviceId ?? randomId();
        return inMemoryDeviceId;
    }
};

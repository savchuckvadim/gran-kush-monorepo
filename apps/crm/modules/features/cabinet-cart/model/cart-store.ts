/**
 * Корзина участника в одном клубе. Хранится в браузере (localStorage): это черновик заказа,
 * а не данные клуба — цены и наличие при оформлении всё равно проверяет сервер. Без доступа к
 * хранилищу (приватное окно, запрет сайта) корзина живёт до перезагрузки страницы.
 *
 * Снимки неизменяемые и кэшируются по клубу, чтобы `useSyncExternalStore` не перерисовывал зря.
 */

export interface CartLine {
    productId: string;
    quantity: number;
}

export type CartLines = readonly CartLine[];

const EMPTY: CartLines = Object.freeze([]);
const STORAGE_PREFIX = "pafpaf.cabinet.cart.";

const snapshots = new Map<string, CartLines>();
const listeners = new Set<() => void>();

const storageKey = (slug: string) => `${STORAGE_PREFIX}${slug}`;

const isCartLine = (value: unknown): value is CartLine =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as CartLine).productId === "string" &&
    typeof (value as CartLine).quantity === "number" &&
    (value as CartLine).quantity > 0;

const readStored = (slug: string): CartLines => {
    try {
        const raw = window.localStorage.getItem(storageKey(slug));
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? Object.freeze(parsed.filter(isCartLine)) : EMPTY;
    } catch {
        return EMPTY;
    }
};

const notify = () => listeners.forEach((listener) => listener());

export const getCartSnapshot = (slug: string): CartLines => {
    if (typeof window === "undefined") return EMPTY;
    let lines = snapshots.get(slug);
    if (!lines) {
        lines = readStored(slug);
        snapshots.set(slug, lines);
    }
    return lines;
};

export const getServerCartSnapshot = (): CartLines => EMPTY;

export const writeCart = (slug: string, lines: CartLine[]): void => {
    const next = Object.freeze(lines.filter((line) => line.quantity > 0));
    snapshots.set(slug, next);
    try {
        if (next.length === 0) window.localStorage.removeItem(storageKey(slug));
        else window.localStorage.setItem(storageKey(slug), JSON.stringify(next));
    } catch {
        // хранилище недоступно — корзина остаётся в памяти вкладки
    }
    notify();
};

/** Подписка на корзины всех клубов; изменения из другой вкладки приходят событием `storage`. */
export const subscribeCart = (listener: () => void): (() => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (!event.key?.startsWith(STORAGE_PREFIX)) return;
        snapshots.delete(event.key.slice(STORAGE_PREFIX.length));
        listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
};

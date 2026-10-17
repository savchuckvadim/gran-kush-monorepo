/** Счётчик неудачных входов по ключу с окном жизни (Redis). */
export abstract class LoginFailureStore {
    /** Число неудач в текущем окне. */
    abstract count(key: string): Promise<number>;

    /** +1 неудача; окно начинается с первой неудачи и не продлевается следующими. */
    abstract increment(key: string, windowSeconds: number): Promise<number>;

    abstract clear(key: string): Promise<void>;
}

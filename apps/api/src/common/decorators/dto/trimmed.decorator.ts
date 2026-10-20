import { Transform } from "class-transformer";

/** Пробелы по краям строки из формы или со сканера не входят в значение (проверка — после). */
export const Trimmed = () =>
    Transform(({ value }: { value: unknown }) =>
        typeof value === "string" ? value.trim() : value
    );

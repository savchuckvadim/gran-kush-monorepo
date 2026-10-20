/** Диапазон комбинируемых диакритических знаков Unicode (U+0300…U+036F). */
const COMBINING_FIRST = 0x300;
const COMBINING_LAST = 0x36f;

/**
 * Текст без диакритики: «Categoría» → «Categoria». Буква со знаком раскладывается (NFKD) на
 * основу и знак, знак отбрасывается. Нужен для кодов статей, заголовков таблиц и поиска дублей.
 */
export const stripAccents = (value: string): string =>
    Array.from(value.normalize("NFKD"))
        .filter((char) => {
            const code = char.charCodeAt(0);
            return code < COMBINING_FIRST || code > COMBINING_LAST;
        })
        .join("");

/** Для сравнения людьми написанного: без диакритики, в нижнем регистре, пробелы схлопнуты. */
export const comparableText = (value: string): string =>
    stripAccents(value).toLowerCase().split(/\s+/).filter(Boolean).join(" ");

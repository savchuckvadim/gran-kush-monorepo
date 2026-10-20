const QUOTE = '"';
const TAB = String.fromCharCode(9);
const BOM = String.fromCharCode(0xfeff);
/** Испанский Excel сохраняет CSV через `;`, остальные — через `,`; выгрузки банков бывают с табом. */
const DELIMITERS = [";", ",", TAB];

const firstLine = (text: string): string => text.split(/\r?\n/, 1)[0] ?? "";

/** Разделитель — тот, что чаще встречается в строке заголовков вне кавычек. */
const detectDelimiter = (header: string): string => {
    const counts = new Map(DELIMITERS.map((d) => [d, 0]));
    let quoted = false;
    for (const char of header) {
        if (char === QUOTE) quoted = !quoted;
        else if (!quoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return best && best[1] > 0 ? best[0] : DELIMITERS[0];
};

/** CSV по RFC 4180: кавычки, удвоенные кавычки, переводы строк внутри поля, BOM в начале. */
export const parseCsv = (input: string): string[][] => {
    const text = input.startsWith(BOM) ? input.slice(1) : input;
    const delimiter = detectDelimiter(firstLine(text));
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
            if (char !== QUOTE) field += char;
            else if (text[i + 1] === QUOTE) {
                field += QUOTE;
                i += 1;
            } else quoted = false;
            continue;
        }
        if (char === QUOTE && field === "") quoted = true;
        else if (char === delimiter) {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else field += char;
    }
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
};

export type CsvValue = string | number | Date | null;

const needsQuotes = (value: string, delimiter: string): boolean =>
    value.includes(delimiter) || value.includes(QUOTE) || /[\r\n]/.test(value);

/** Число — с запятой: так его прочитает испанский Excel вместе с разделителем `;`. */
const formatValue = (value: CsvValue, delimiter: string): string => {
    if (value === null) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = typeof value === "number" ? String(value).replace(".", ",") : value;
    return needsQuotes(text, delimiter)
        ? `${QUOTE}${text.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`
        : text;
};

/** CSV для испанского Excel: BOM (UTF-8 с акцентами), `;`, CRLF. */
export const toCsv = (rows: readonly (readonly CsvValue[])[], delimiter = ";"): string =>
    BOM +
    rows
        .map((row) => row.map((value) => formatValue(value, delimiter)).join(delimiter))
        .join("\r\n") +
    "\r\n";

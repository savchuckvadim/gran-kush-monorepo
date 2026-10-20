/**
 * Испанские налоговые номера: NIF физлица (DNI), NIE иностранца и CIF (NIF юрлица). Проверяется
 * контрольный знак — опечатка в номере иначе ушла бы в книги, фактуры и Modelo 347.
 */
export type SpanishTaxIdKind = "nif" | "nie" | "cif";

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";
/** Юрлица, у которых контрольный знак CIF — всегда буква */
const CIF_LETTER_CONTROL = new Set(["N", "P", "Q", "R", "S", "W"]);
/** Юрлица, у которых контрольный знак CIF — всегда цифра */
const CIF_DIGIT_CONTROL = new Set(["A", "B", "E", "H"]);

/** `b-12.345.678` → `B12345678`: без пробелов, точек и дефисов, заглавными. */
export const normalizeTaxId = (raw: string): string => raw.toUpperCase().replace(/[\s.\-/]/g, "");

const dniLetter = (digits: string): string => DNI_LETTERS[Number(digits) % 23];

const isNif = (value: string): boolean =>
    /^\d{8}[A-Z]$/.test(value) && dniLetter(value.slice(0, 8)) === value[8];

const isNie = (value: string): boolean => {
    if (!/^[XYZ]\d{7}[A-Z]$/.test(value)) return false;
    const digits = `${"XYZ".indexOf(value[0])}${value.slice(1, 8)}`;
    return dniLetter(digits) === value[8];
};

const isCif = (value: string): boolean => {
    if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(value)) return false;
    const digits = value.slice(1, 8);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        const digit = Number(digits[i]);
        if (i % 2 === 0) {
            const doubled = digit * 2;
            sum += Math.floor(doubled / 10) + (doubled % 10);
        } else {
            sum += digit;
        }
    }
    const controlDigit = (10 - (sum % 10)) % 10;
    const control = value[8];
    const type = value[0];
    const asDigit = control === String(controlDigit);
    const asLetter = control === CIF_CONTROL_LETTERS[controlDigit];
    if (CIF_LETTER_CONTROL.has(type)) return asLetter;
    if (CIF_DIGIT_CONTROL.has(type)) return asDigit;
    return asDigit || asLetter;
};

/** Вид номера, если он корректен; `null` — номер с ошибкой или не испанский. */
export const classifySpanishTaxId = (raw: string): SpanishTaxIdKind | null => {
    const value = normalizeTaxId(raw);
    if (isNif(value)) return "nif";
    if (isNie(value)) return "nie";
    if (isCif(value)) return "cif";
    return null;
};

/** Первая буква CIF — форма юрлица: G — asociación, B — SL, A — SA. */
export const cifEntityLetter = (raw: string): string | null => {
    const value = normalizeTaxId(raw);
    return isCif(value) ? value[0] : null;
};

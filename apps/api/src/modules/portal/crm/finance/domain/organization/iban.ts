/** Длина IBAN по странам SEPA, с которыми работают клубы и студии; другие проверяются без длины. */
const IBAN_LENGTHS: Record<string, number> = {
    ES: 24,
    PT: 25,
    FR: 27,
    IT: 27,
    DE: 22,
    NL: 18,
    BE: 16,
    AT: 20,
    IE: 22,
    LU: 20,
    GB: 22,
    CH: 21,
};

export const normalizeIban = (raw: string): string => raw.toUpperCase().replace(/\s/g, "");

/** IBAN по ISO 13616: формат, длина страны и контрольная сумма mod 97. */
export const isValidIban = (raw: string): boolean => {
    const iban = normalizeIban(raw);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
    const expected = IBAN_LENGTHS[iban.slice(0, 2)];
    if (expected !== undefined && iban.length !== expected) return false;
    const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
    let remainder = 0;
    for (const char of rearranged) {
        const code = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
        for (const digit of code) {
            remainder = (remainder * 10 + Number(digit)) % 97;
        }
    }
    return remainder === 1;
};

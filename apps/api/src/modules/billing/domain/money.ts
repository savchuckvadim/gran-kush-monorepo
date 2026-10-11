/** Деньги в центах — без float: "49.00" ↔ 4900. */
export const amountToCents = (amount: string): number => {
    const [whole, fraction = ""] = amount.trim().split(".");
    const sign = whole.startsWith("-") ? -1 : 1;
    return sign * (Math.abs(Number(whole)) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2)));
};

export const centsToAmount = (cents: number): string => {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents);
    return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
};

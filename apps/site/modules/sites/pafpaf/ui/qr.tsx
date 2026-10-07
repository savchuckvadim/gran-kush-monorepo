const SIZE = 21;

const finder = (row: number, col: number, top: number, left: number): boolean | null => {
    const dr = row - top;
    const dc = col - left;
    if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return null;
    return (
        dr === 0 || dc === 0 || dr === 6 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
    );
};

const quietZone = (row: number, col: number): boolean =>
    (row === 7 && (col < 8 || col > SIZE - 9)) ||
    (col === 7 && (row < 8 || row > SIZE - 9)) ||
    (row === SIZE - 8 && col < 8) ||
    (col === SIZE - 8 && row < 8);

// A decorative QR (three finder patterns and seeded noise), not a scannable code.
const cells = (seed: number): boolean[] => {
    let state = seed;
    const random = () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
    const out: boolean[] = [];
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const pattern =
                finder(row, col, 0, 0) ??
                finder(row, col, 0, SIZE - 7) ??
                finder(row, col, SIZE - 7, 0);
            const value = pattern ?? (quietZone(row, col) ? false : random() > 0.52);
            out.push(value);
        }
    }
    return out;
};

export const Qr = ({ seed }: { seed: number }) => (
    <div className="qr" aria-hidden="true">
        {cells(seed).map((on, index) => (
            <i key={index} className={on ? undefined : "o"} />
        ))}
    </div>
);

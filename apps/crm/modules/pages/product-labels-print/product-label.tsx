import { QrCodeDisplay } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { LabelFormat } from "@/modules/features/product-labels";

/** Сторона QR в пикселях до масштаба: печать задаёт размер в миллиметрах классом */
const QR_PIXELS = 256;

interface ProductLabelProps {
    format: LabelFormat;
    name: string;
    price: string;
    code: string;
    url: string;
}

/** Одна этикетка: QR со ссылкой на сканер клуба, название, цена и код для ввода руками. */
export function ProductLabel({ format, name, price, code, url }: ProductLabelProps) {
    const tape = format === "tape";
    return (
        <div
            className={cn(
                "flex items-center gap-[3mm] overflow-hidden bg-white text-black break-inside-avoid",
                tape
                    ? "h-[40mm] w-[58mm] break-after-page px-[3mm]"
                    : "h-[37mm] w-[70mm] border border-dashed border-neutral-300 px-[3mm] print:border-transparent"
            )}
        >
            <QrCodeDisplay
                value={url}
                size={QR_PIXELS}
                level="M"
                includeMargin={false}
                className={cn("shrink-0", tape ? "size-[30mm]" : "size-[28mm]")}
            />
            <div className="min-w-0 space-y-[1mm]">
                <p className="line-clamp-3 text-[10pt] leading-tight font-semibold">{name}</p>
                <p className="text-[11pt] font-bold tabular-nums">{price}</p>
                <p className="font-mono text-[8pt] tracking-wider text-neutral-600">{code}</p>
            </div>
        </div>
    );
}

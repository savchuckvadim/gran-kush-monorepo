/** Колонка таблицы отчёта: текст слева, суммы справа. `width` — доля ширины страницы. */
export interface ReportColumn {
    title: string;
    align: "left" | "right";
    width: number;
}

/** Строка таблицы; `strong` — итог, выделяется. */
export interface ReportRow {
    cells: string[];
    strong?: boolean;
}

export interface ReportSection {
    title: string;
    /** Пояснение под заголовком: почему форма не подаётся, что проверить */
    notes: string[];
    columns: ReportColumn[];
    rows: ReportRow[];
}

/**
 * Документ отчёта без привязки к формату: заголовок, реквизиты, разделы с таблицами. Все тексты
 * и суммы уже отформатированы — рисовальщик только раскладывает их по страницам.
 */
export interface ReportDocument {
    title: string;
    /** Реквизиты организации: название, NIF, адрес — строками */
    organization: string[];
    subtitle: string;
    generatedAt: string;
    sections: ReportSection[];
    footer: string;
}

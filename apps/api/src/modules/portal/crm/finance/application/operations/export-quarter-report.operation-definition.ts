import { defineOperation } from "@modules/operations";

import type {
    QuarterReportFile,
    QuarterReportInput,
} from "../use-cases/export-quarter-report.use-case";

/** Квартальный отчёт для gestor в PDF: маршрут отвечает 202, файл собирается в очереди. */
export const EXPORT_QUARTER_REPORT = defineOperation<QuarterReportInput, QuarterReportFile>({
    kind: "finance.report_pdf",
    description: "Quarterly report for the gestor as a PDF with a download link",
});

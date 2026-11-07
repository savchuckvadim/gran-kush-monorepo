import type { ReportDocument } from "../reports/report-document";

/** Отчёт в файл: документ уже собран и отформатирован, рисовальщик только раскладывает его. */
export abstract class FinanceReportRenderer {
    abstract renderPdf(document: ReportDocument): Promise<Buffer>;
}

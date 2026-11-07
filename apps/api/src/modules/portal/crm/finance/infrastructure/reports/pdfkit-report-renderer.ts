import { Injectable } from "@nestjs/common";

import PDFDocument from "pdfkit";

import type {
    ReportColumn,
    ReportDocument,
    ReportRow,
    ReportSection,
} from "../../domain/reports/report-document";
import { FinanceReportRenderer } from "../../domain/repositories/finance-report-renderer.interface";

type Pdf = InstanceType<typeof PDFDocument>;

const MARGIN = 48;
const FOOTER_GAP = 18;
const FONT = "Helvetica";
const BOLD = "Helvetica-Bold";
const SIZE = { title: 16, subtitle: 10, section: 11, body: 9, small: 8 } as const;
const CELL_PADDING_Y = 3;
const CELL_GAP_X = 6;
const SECTION_GAP = 14;
/** Высота однострочной строки таблицы — для решения, переносить ли раздел целиком */
const ROW_ESTIMATE = SIZE.body * 1.2 + CELL_PADDING_Y * 2;
const RULE_COLOR = "#d4d4d8";
const MUTED_COLOR = "#52525b";
const TEXT_COLOR = "#18181b";

/**
 * PDF отчёта на pdfkit: A4, стандартный Helvetica (испанские буквы и € — в его кодировке, шрифт
 * не встраивается), таблицы переносятся на следующую страницу с повтором шапки, внизу каждой
 * страницы — пометка «не декларация» и номер страницы.
 */
@Injectable()
export class PdfkitReportRenderer extends FinanceReportRenderer {
    renderPdf(document: ReportDocument): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const pdf = new PDFDocument({
                size: "A4",
                margin: MARGIN,
                bufferPages: true,
                info: { Title: document.title },
            });
            const chunks: Buffer[] = [];
            pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
            pdf.on("end", () => resolve(Buffer.concat(chunks)));
            pdf.on("error", reject);

            this.header(pdf, document);
            for (const section of document.sections) this.section(pdf, section);
            this.footers(pdf, document.footer);
            pdf.end();
        });
    }

    private contentWidth(pdf: Pdf): number {
        return pdf.page.width - MARGIN * 2;
    }

    private bottom(pdf: Pdf): number {
        return pdf.page.height - MARGIN;
    }

    private header(pdf: Pdf, document: ReportDocument): void {
        pdf.fillColor(TEXT_COLOR).font(BOLD).fontSize(SIZE.title).text(document.title);
        pdf.font(FONT).fontSize(SIZE.subtitle).text(document.subtitle);
        pdf.moveDown(0.5);
        pdf.fontSize(SIZE.body);
        for (const line of document.organization) pdf.text(line);
        pdf.fillColor(MUTED_COLOR).fontSize(SIZE.small).text(document.generatedAt);
        pdf.fillColor(TEXT_COLOR).moveDown(1);
    }

    /** Раздел целиком на новую страницу, если он короче страницы, но в остаток не влезает. */
    private section(pdf: Pdf, section: ReportSection): void {
        const width = this.contentWidth(pdf);
        const estimate =
            SECTION_GAP * 2 +
            section.notes.length * SIZE.small * 2 +
            (section.rows.length + 1) * ROW_ESTIMATE;
        const fitsOnFreshPage = estimate < this.bottom(pdf) - MARGIN;
        if (pdf.y + (fitsOnFreshPage ? estimate : SECTION_GAP * 3) > this.bottom(pdf)) {
            pdf.addPage();
        }
        pdf.font(BOLD).fontSize(SIZE.section).text(section.title, MARGIN, pdf.y, { width });
        pdf.font(FONT).fontSize(SIZE.small).fillColor(MUTED_COLOR);
        for (const note of section.notes) pdf.text(note, MARGIN, pdf.y, { width });
        pdf.fillColor(TEXT_COLOR).moveDown(0.3);
        if (section.rows.length > 0) {
            this.row(pdf, section.columns, { cells: section.columns.map((c) => c.title) }, true);
            for (const row of section.rows) this.row(pdf, section.columns, row, false);
        }
        pdf.y += SECTION_GAP;
    }

    /** Строка таблицы: высота — по самой высокой ячейке; не помещается — новая страница с шапкой. */
    private row(pdf: Pdf, columns: ReportColumn[], row: ReportRow, head: boolean): void {
        const width = this.contentWidth(pdf);
        pdf.font(head || row.strong ? BOLD : FONT).fontSize(head ? SIZE.small : SIZE.body);
        const widths = columns.map((column) => column.width * width - CELL_GAP_X);
        const height =
            Math.max(
                ...row.cells.map((cell, index) =>
                    pdf.heightOfString(cell, { width: widths[index] })
                )
            ) +
            CELL_PADDING_Y * 2;
        if (pdf.y + height > this.bottom(pdf)) {
            pdf.addPage();
            if (!head) this.row(pdf, columns, { cells: columns.map((c) => c.title) }, true);
            pdf.font(row.strong ? BOLD : FONT).fontSize(SIZE.body);
        }
        const top = pdf.y;
        let x = MARGIN;
        row.cells.forEach((cell, index) => {
            const column = columns[index];
            if (!column) return;
            pdf.fillColor(head ? MUTED_COLOR : TEXT_COLOR).text(cell, x, top + CELL_PADDING_Y, {
                width: widths[index],
                align: column.align,
            });
            x += column.width * width;
        });
        const bottom = top + height;
        pdf.moveTo(MARGIN, bottom)
            .lineTo(MARGIN + width, bottom)
            .lineWidth(0.5)
            .strokeColor(RULE_COLOR)
            .stroke();
        pdf.fillColor(TEXT_COLOR);
        pdf.x = MARGIN;
        pdf.y = bottom;
    }

    private footers(pdf: Pdf, footer: string): void {
        const range = pdf.bufferedPageRange();
        for (let index = range.start; index < range.start + range.count; index += 1) {
            pdf.switchToPage(index);
            // текст ниже нижнего поля pdfkit переносит на новую страницу — поле снимаем на время
            const margin = pdf.page.margins.bottom;
            pdf.page.margins.bottom = 0;
            pdf.font(FONT)
                .fontSize(SIZE.small)
                .fillColor(MUTED_COLOR)
                .text(
                    `${footer} · ${index - range.start + 1}/${range.count}`,
                    MARGIN,
                    pdf.page.height - MARGIN + FOOTER_GAP / 2,
                    { width: this.contentWidth(pdf), align: "center" }
                );
            pdf.page.margins.bottom = margin;
        }
    }
}

import { Injectable } from "@nestjs/common";

import { importTemplate } from "../../domain/import/import-template";
import { localDate } from "../../domain/ledger/finance-period";
import { FinanceDirectory } from "../../domain/repositories/finance-sources.interface";
import { LedgerSpreadsheet } from "../../domain/repositories/ledger-spreadsheet.interface";
import { buildLedgerFile, type LedgerFile, type LedgerFileFormat } from "../ledger-files";

import { FinanceCategoriesService } from "./finance-categories.service";

const TEMPLATE_NAME = "plantilla-movimientos";

/** Шаблон импорта на статьях клуба: примеры текущего месяца, лист статей и памятка. */
@Injectable()
export class LedgerTemplateService {
    constructor(
        private readonly categories: FinanceCategoriesService,
        private readonly directory: FinanceDirectory,
        private readonly spreadsheet: LedgerSpreadsheet
    ) {}

    async template(portalId: string, format: LedgerFileFormat): Promise<LedgerFile> {
        const [categories, timeZone] = await Promise.all([
            this.categories.list(portalId, false),
            this.directory.timeZone(portalId),
        ]);
        const month = localDate(new Date(), timeZone).slice(0, 7);
        return buildLedgerFile(
            this.spreadsheet,
            importTemplate(categories, month),
            format,
            TEMPLATE_NAME
        );
    }
}

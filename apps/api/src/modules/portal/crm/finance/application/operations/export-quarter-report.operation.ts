import { Injectable } from "@nestjs/common";

import { type OperationContext, type OperationRunner, RunsOperation } from "@modules/operations";

import {
    ExportQuarterReportUseCase,
    type QuarterReportFile,
    type QuarterReportInput,
} from "../use-cases/export-quarter-report.use-case";

import { EXPORT_QUARTER_REPORT } from "./export-quarter-report.operation-definition";

@Injectable()
@RunsOperation(EXPORT_QUARTER_REPORT)
export class ExportQuarterReportOperation implements OperationRunner<typeof EXPORT_QUARTER_REPORT> {
    constructor(private readonly exportReport: ExportQuarterReportUseCase) {}

    run(input: QuarterReportInput, context: OperationContext): Promise<QuarterReportFile> {
        return this.exportReport.execute(context, input);
    }
}

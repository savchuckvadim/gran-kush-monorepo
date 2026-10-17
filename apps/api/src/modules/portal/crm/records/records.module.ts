import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";

import { CrmEntityRecordsController } from "./api/controllers/crm-entity-records.controller";
import { EntityRecordsService } from "./application/services/entity-records.service";
import { RecordRelationsService } from "./application/services/record-relations.service";
import { RecordStageService } from "./application/services/record-stage.service";
import { StagePositionService } from "./application/services/stage-position.service";
import { StagePositionRepository } from "./domain/repositories/stage-position.repository";
import { StagePositionPrismaRepository } from "./infrastructure/repositories/stage-position-prisma.repository";

@Module({
    imports: [PrismaModule, EntityFieldsModule],
    controllers: [CrmEntityRecordsController],
    providers: [
        EntityRecordsService,
        RecordRelationsService,
        RecordStageService,
        StagePositionService,
        { provide: StagePositionRepository, useClass: StagePositionPrismaRepository },
    ],
    exports: [EntityRecordsService, StagePositionService],
})
export class RecordsModule {}

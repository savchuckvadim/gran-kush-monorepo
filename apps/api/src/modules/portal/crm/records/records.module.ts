import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";

import { CrmEntityRecordsController } from "./api/controllers/crm-entity-records.controller";
import { EntityRecordsService } from "./application/services/entity-records.service";

@Module({
    imports: [PrismaModule, EntityFieldsModule],
    controllers: [CrmEntityRecordsController],
    providers: [EntityRecordsService],
    exports: [EntityRecordsService],
})
export class RecordsModule {}

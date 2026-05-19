import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CrmEntityDefinitionsController } from "@modules/portal/crm/entity-fields/api/controllers/crm-entity-definitions.controller";
import { CrmEntityFieldsSettingsController } from "@modules/portal/crm/entity-fields/api/controllers/crm-entity-fields-settings.controller";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import { FormLayoutSettingsService } from "@modules/portal/crm/entity-fields/application/services/form-layout-settings.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { OrderStagesService } from "@modules/portal/crm/entity-fields/application/services/order-stages.service";
import { PortalEntityMetadataService } from "@modules/portal/crm/entity-fields/application/services/portal-entity-metadata.service";
import { PortalFieldSettingsService } from "@modules/portal/crm/entity-fields/application/services/portal-field-settings.service";
import { ProvisionPortalFromTemplatesService } from "@modules/portal/crm/entity-fields/application/services/provision-portal-from-templates.service";

@Module({
    imports: [PrismaModule],
    controllers: [CrmEntityFieldsSettingsController, CrmEntityDefinitionsController],
    providers: [
        ProvisionPortalFromTemplatesService,
        PortalEntityMetadataService,
        FormSchemaService,
        FormLayoutSettingsService,
        PortalFieldSettingsService,
        DynamicPayloadValidatorService,
        FieldValuesService,
        OrderStagesService,
    ],
    exports: [
        ProvisionPortalFromTemplatesService,
        PortalEntityMetadataService,
        FormSchemaService,
        FormLayoutSettingsService,
        PortalFieldSettingsService,
        DynamicPayloadValidatorService,
        FieldValuesService,
        OrderStagesService,
    ],
})
export class EntityFieldsModule {}

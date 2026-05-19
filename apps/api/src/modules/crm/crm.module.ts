import { Module } from "@nestjs/common";

import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { EmployeesModule } from "@modules/portal/crm/employees/employees.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { FinanceModule } from "@modules/portal/crm/finance/finance.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { OrdersModule } from "@modules/portal/crm/orders/orders.module";
import { PortalContextModule } from "@modules/portal/crm/portals/portal-context.module";
import { PortalsModule } from "@modules/portal/crm/portals/portals.module";
import { PresenceModule } from "@modules/portal/crm/presence/presence.module";
import { QrCodesModule } from "@modules/portal/crm/qr-codes/qr-codes.module";

/** CRM и портальный контекст поверх общего ядра. */
@Module({
    imports: [
        PortalContextModule,
        PortalsModule,
        EntityFieldsModule,
        EmployeesModule,
        MembersModule,
        CatalogModule,
        QrCodesModule,
        PresenceModule,
        OrdersModule,
        FinanceModule,
    ],
})
export class CrmModule {}

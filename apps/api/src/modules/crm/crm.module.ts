import { Module } from "@nestjs/common";

import { AccessModule } from "@modules/portal/crm/access/access.module";
import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { ClubPolicyModule } from "@modules/portal/crm/club-policy/club-policy.module";
import { EmployeesModule } from "@modules/portal/crm/employees/employees.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { FinanceModule } from "@modules/portal/crm/finance/finance.module";
import { InvitationsModule } from "@modules/portal/crm/invitations/invitations.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { OrdersModule } from "@modules/portal/crm/orders/orders.module";
import { PortalModulesModule } from "@modules/portal/crm/portal-modules/portal-modules.module";
import { PortalContextModule } from "@modules/portal/crm/portals/portal-context.module";
import { PortalsModule } from "@modules/portal/crm/portals/portals.module";
import { PresenceModule } from "@modules/portal/crm/presence/presence.module";
import { QrCodesModule } from "@modules/portal/crm/qr-codes/qr-codes.module";
import { RecordsModule } from "@modules/portal/crm/records/records.module";
import { RegistrationLinksModule } from "@modules/portal/crm/registration-links/registration-links.module";
import { ScanModule } from "@modules/portal/crm/scan/scan.module";
import { SearchModule } from "@modules/portal/crm/search/search.module";
import { StockModule } from "@modules/portal/crm/stock/stock.module";
import { UiSettingsModule } from "@modules/portal/crm/ui-settings/ui-settings.module";
import { PublicPortalModule } from "@modules/portal/public/public-portal.module";

/** CRM и портальный контекст поверх общего ядра. */
@Module({
    imports: [
        PortalContextModule,
        PortalsModule,
        PortalModulesModule,
        AccessModule,
        EntityFieldsModule,
        EmployeesModule,
        MembersModule,
        CatalogModule,
        QrCodesModule,
        PresenceModule,
        OrdersModule,
        FinanceModule,
        StockModule,
        ScanModule,
        InvitationsModule,
        RegistrationLinksModule,
        RecordsModule,
        SearchModule,
        UiSettingsModule,
        PublicPortalModule,
        ClubPolicyModule,
    ],
})
export class CrmModule {}

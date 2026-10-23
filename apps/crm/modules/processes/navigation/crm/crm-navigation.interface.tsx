import type { BrandModuleCode } from "@workspace/brand";

import type { Permission } from "@/modules/entities/access";
import type { PortalModuleCode } from "@/modules/entities/portal-modules";
import { ISidebarItem } from "@/modules/shared/ui/Sidebar";

export interface ICrmNavigation extends ISidebarItem {
    /** Пункт виден, если у роли есть хотя бы одно из прав; без списка — виден всем сотрудникам */
    requires?: readonly Permission[];
    /**
     * Раздел подключаемого модуля (TASK-796): виден, когда модуль включён, а тому, кто может его
     * подключить (settings.club), — всегда: раздел предложит подключение
     */
    module?: PortalModuleCode;
    /** Раздел корневой функции инсталляции (TASK-793): без неё в бренде пункта нет вовсе */
    brandModule?: BrandModuleCode;
}

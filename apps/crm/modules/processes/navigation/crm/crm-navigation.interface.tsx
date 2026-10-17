import type { Permission } from "@/modules/entities/access";
import { ISidebarItem } from "@/modules/shared/ui/Sidebar";

export interface ICrmNavigation extends ISidebarItem {
    /** Пункт виден, если у роли есть хотя бы одно из прав; без списка — виден всем сотрудникам */
    requires?: readonly Permission[];
}

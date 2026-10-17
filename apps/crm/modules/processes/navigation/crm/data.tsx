import {
    CalendarCheck,
    Package,
    Settings,
    ShoppingBag,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";

import { SETTINGS_PERMISSIONS } from "@/modules/entities/access";
import { ROUTES } from "@/modules/shared/config/routes";

import { ICrmNavigation } from "./crm-navigation.interface";

export const CRM_NAVIGATION: ICrmNavigation[] = [
    {
        id: 1,
        code: "clients",
        url: ROUTES.CRM_MEMBERS,
        title: "Clients",
        isActive: false,
        requires: ["members.read"],
        icon: <Users />,
    },
    {
        id: 2,
        code: "products",
        url: ROUTES.CRM_PRODUCTS,
        title: "Products",
        isActive: false,
        icon: <Package />,
    },
    {
        id: 3,
        code: "orders",
        url: ROUTES.CRM_ORDERS,
        title: "Orders",
        isActive: false,
        requires: ["orders.read"],
        icon: <ShoppingBag />,
    },
    {
        id: 4,
        code: "attendance",
        url: ROUTES.CRM_ATTENDANCE,
        title: "Attendance",
        isActive: false,
        requires: ["presence.read", "presence.checkin"],
        icon: <CalendarCheck />,
    },
    {
        id: 5,
        code: "finance",
        url: ROUTES.CRM_FINANCE,
        title: "Finance",
        isActive: false,
        requires: ["finance.read"],
        icon: <Wallet />,
    },
    {
        id: 6,
        code: "employees",
        url: ROUTES.CRM_EMPLOYEES,
        title: "Employees",
        isActive: false,
        requires: ["employees.read"],
        icon: <UserCog />,
    },
    {
        id: 7,
        code: "settings",
        url: ROUTES.CRM_SETTINGS,
        title: "Settings",
        isActive: false,
        requires: SETTINGS_PERMISSIONS,
        icon: <Settings />,
    },
];

import { Cat, Gamepad2, Gem, Hop, PiggyBank, Rabbit, Settings } from "lucide-react";

import { ROUTES } from "@/modules/shared/config/routes";

import { ICrmNavigation } from "./crm-navigation.interface";

export const CRM_NAVIGATION: ICrmNavigation[] = [
    {
        id: 1,
        code: "clients",
        url: ROUTES.CRM_MEMBERS,
        title: "Clients",
        isActive: false,
        isAdmin: false,
        icon: <Cat />,
    },
    {
        id: 2,
        code: "products",
        url: ROUTES.CRM_PRODUCTS,
        title: "Products",
        isActive: false,
        isAdmin: false,
        icon: <Hop />,
    },
    {
        id: 3,
        code: "orders",
        url: ROUTES.CRM_ORDERS,
        title: "Orders",
        isActive: false,
        isAdmin: false,
        icon: <Gem />,
    },
    {
        id: 4,
        code: "attendance",
        url: ROUTES.CRM_ATTENDANCE,
        title: "Attendance",
        isActive: false,
        isAdmin: false,
        icon: <Gamepad2 />,
    },
    {
        id: 5,
        code: "finance",
        url: ROUTES.CRM_FINANCE,
        title: "Finance",
        isActive: false,
        isAdmin: false,
        icon: <PiggyBank />,
    },
    {
        id: 6,
        code: "employees",
        url: ROUTES.CRM_EMPLOYEES,
        title: "Employees",
        isActive: false,
        isAdmin: true,
        icon: <Rabbit />,
    },
    {
        id: 7,
        code: "settings",
        url: ROUTES.CRM_SETTINGS,
        title: "Settings",
        isActive: false,
        isAdmin: false,
        icon: <Settings />,
    },
];

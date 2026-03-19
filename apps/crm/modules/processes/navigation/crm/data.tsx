import { BarChart3, Package, ShoppingCart, UserRoundCog, Users, Wallet } from "lucide-react";

import { ROUTES } from "@/modules/shared/config/routes";

import { ICrmNavigation } from "./crm-navigation.interface";

export const CRM_NAVIGATION: ICrmNavigation[] = [
    {
        id: 1,
        code: "clients",
        url: ROUTES.CRM_MEMBERS,
        title: "Clients",
        isActive: false,
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
        icon: <ShoppingCart />,
    },
    {
        id: 4,
        code: "attendance",
        url: ROUTES.CRM_ATTENDANCE,
        title: "Attendance",
        isActive: false,
        icon: <BarChart3 />,
    },
    {
        id: 5,
        code: "finance",
        url: ROUTES.CRM_FINANCE,
        title: "Finance",
        isActive: false,
        icon: <Wallet />,
    },
    {
        id: 6,
        code: "employees",
        url: ROUTES.CRM_EMPLOYEES,
        title: "Employees",
        isActive: false,
        icon: <UserRoundCog />,
    },
];

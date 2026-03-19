import { Cannabis, History, QrCode, Settings } from "lucide-react";

import { ROUTES } from "@/modules/shared";

import { IProfileNavigation } from "./profile-navigation.interface";



export const PROFILE_NAVIGATION: IProfileNavigation[] = [
    {
        id: 1,
        code: "dashboard",
        url: ROUTES.PROFILE,
        title: "Dashboard",
        isActive: false,
        icon: <Cannabis />,
    },

    {
        id: 2,
        code: "qrCode",
        url: ROUTES.PROFILE_QR_CODE,
        title: "QR Code",
        isActive: false,
        icon: <QrCode />,
    },
    {
        id: 3,
        code: "presence",
        url: ROUTES.PROFILE_PRESENCE,
        title: "Presence",
        isActive: false,
        icon: <History />,
    },
    {
        id: 4,
        code: "settings",
        url: ROUTES.PROFILE_SETTINGS,
        title: "Settings",
        isActive: false,
        icon: <Settings />,
    },

];
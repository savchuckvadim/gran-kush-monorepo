"use client";

import { useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { NotificationBell } from "@/modules/widgets/notification-bell";

/** Колокольчик сотрудника: заказ из уведомления открывается в слайдере поверх страницы. */
export function CrmNotificationBell() {
    const openEntity = useOpenEntity();

    return (
        <NotificationBell
            app="crm"
            club={null}
            onOpen={({ subjectKind, subjectId }) => {
                if (subjectKind === "order") openEntity({ kind: "order", id: subjectId });
            }}
        />
    );
}

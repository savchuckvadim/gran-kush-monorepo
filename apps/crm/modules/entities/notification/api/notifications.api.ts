import {
    assertOpenApiOk,
    type SchemaNotificationDto,
    type SchemaNotificationListDto,
    type SchemaNotificationPreferencesDto,
    type SchemaUnreadNotificationsDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";
import { $cabinetApi } from "@/modules/shared/api";

export type Notification = SchemaNotificationDto;
export type NotificationPage = SchemaNotificationListDto;
export type NotificationPreferences = SchemaNotificationPreferencesDto;

/** Колокольчик есть в двух приложениях: у сотрудника — CRM, у участника — кабинет клуба. */
export type NotificationApp = "crm" | "cabinet";

export interface NotificationsApi {
    list: (cursor: string | undefined) => Promise<NotificationPage>;
    unread: () => Promise<number>;
    read: (ids: string[] | undefined) => Promise<void>;
    preferences: () => Promise<NotificationPreferences>;
    setTelegram: (telegram: boolean) => Promise<NotificationPreferences>;
}

const crm: NotificationsApi = {
    list: async (cursor) =>
        assertOpenApiOk<NotificationPage>(
            await $api.GET("/crm/notifications", { params: { query: cursor ? { cursor } : {} } })
        ),
    unread: async () =>
        (
            await assertOpenApiOk<SchemaUnreadNotificationsDto>(
                await $api.GET("/crm/notifications/unread-count")
            )
        ).unread,
    read: async (ids) => {
        assertOpenApiOk(await $api.POST("/crm/notifications/read", { body: ids ? { ids } : {} }));
    },
    preferences: async () =>
        assertOpenApiOk<NotificationPreferences>(await $api.GET("/crm/notifications/preferences")),
    setTelegram: async (telegram) =>
        assertOpenApiOk<NotificationPreferences>(
            await $api.PUT("/crm/notifications/preferences", { body: { telegram } })
        ),
};

const cabinet: NotificationsApi = {
    list: async (cursor) =>
        assertOpenApiOk<NotificationPage>(
            await $cabinetApi.GET("/cabinet/notifications", {
                params: { query: cursor ? { cursor } : {} },
            })
        ),
    unread: async () =>
        (
            await assertOpenApiOk<SchemaUnreadNotificationsDto>(
                await $cabinetApi.GET("/cabinet/notifications/unread-count")
            )
        ).unread,
    read: async (ids) => {
        assertOpenApiOk(
            await $cabinetApi.POST("/cabinet/notifications/read", { body: ids ? { ids } : {} })
        );
    },
    preferences: async () =>
        assertOpenApiOk<NotificationPreferences>(
            await $cabinetApi.GET("/cabinet/notifications/preferences")
        ),
    setTelegram: async (telegram) =>
        assertOpenApiOk<NotificationPreferences>(
            await $cabinetApi.PUT("/cabinet/notifications/preferences", { body: { telegram } })
        ),
};

export const NOTIFICATIONS_API: Record<NotificationApp, NotificationsApi> = { crm, cabinet };

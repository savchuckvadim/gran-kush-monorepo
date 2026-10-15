"use client";

import { useMemo } from "react";

import { UI_SETTING_KEYS, useSaveUiSetting, useUiSetting } from "@/modules/entities/ui-settings";

import { DEFAULT_ORDER_CARD_FIELDS, type OrderCardField, parseCardFields } from "./card-fields";

export interface OrderCardFieldsState {
    /** Что показывать: личная настройка, иначе клубная, иначе умолчания */
    fields: OrderCardField[];
    setFields: (fields: OrderCardField[]) => void;
    /** Убрать личную настройку: вернётся клубная или умолчания */
    reset: () => void;
    isSaving: boolean;
}

/**
 * Поля карточки канбана. Настройка живёт на сервере: клубная — общая для всех, личная —
 * поверх неё у каждого сотрудника. Шестерёнка меняет личную; клубную задают в настройках CRM.
 */
export function useOrderCardFields(): OrderCardFieldsState {
    const setting = useUiSetting(UI_SETTING_KEYS.orderKanbanCard);
    const save = useSaveUiSetting(UI_SETTING_KEYS.orderKanbanCard);

    const fields = useMemo(() => {
        const data = setting.data;
        // пока настройка грузится, доска рисуется умолчаниями — без прыжка на пустую карточку
        if (!data) return [...DEFAULT_ORDER_CARD_FIELDS];
        return parseCardFields(data.employee ?? data.portal);
    }, [setting.data]);

    return {
        fields,
        setFields: (next) => save.mutate({ value: next }),
        reset: () => save.mutate({ value: null }),
        isSaving: save.isPending,
    };
}

import { personName } from "@/modules/shared";

/** Выбранный участник: для заказа, проводки, любого поля «кто». */
export interface MemberChoice {
    id: string;
    name: string;
    email?: string | null;
    isActive: boolean;
}

/** Участник без имени показывается одной почтой, а не почтой дважды. */
export const toMemberChoice = (member: {
    id: string;
    name: string;
    surname?: string | null;
    email?: string | null;
    isActive: boolean;
}): MemberChoice => ({
    id: member.id,
    name: personName(member, ""),
    email: member.email,
    isActive: member.isActive,
});

/** Поиск ждёт паузы в наборе. */
export const MEMBER_SEARCH_DEBOUNCE_MS = 200;

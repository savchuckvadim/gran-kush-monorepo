/**
 * Почему отсканированный QR не пропустили. Клиенты показывают текст на языке интерфейса по
 * коду, а не по строке API: так сообщения переводятся и не зависят от формулировок сервера.
 */
export const QR_SCAN_ERROR_CODES = [
    /** Строка не похожа на код входа: чужой QR или повреждённый снимок. */
    "malformed",
    /** Срок действия кода вышел: участник открывает кабинет и получает свежий. */
    "expired",
    /** Код не совпадает с действующим у участника: его перевыпустили или отозвали. */
    "revoked",
    /** Код принадлежит другому клубу, не тому, где сканирует сотрудник. */
    "wrong_club",
    /** Участник отключён клубом. */
    "member_inactive",
    /** Участник ещё не подтвердил членство (TASK-703): клуб ему пока чужой. */
    "membership_unconfirmed",
] as const;

export type QrScanErrorCode = (typeof QR_SCAN_ERROR_CODES)[number];

/** Технические сообщения для логов и клиентов без перевода; интерфейс переводит по коду. */
export const QR_SCAN_ERROR_MESSAGES: Record<QrScanErrorCode, string> = {
    malformed: "Not a club entry code",
    expired: "QR code has expired",
    revoked: "QR code was replaced or revoked",
    wrong_club: "QR code belongs to another club",
    member_inactive: "Member is not active",
    membership_unconfirmed: "Membership is not confirmed by the member",
};

/**
 * Зачем начат вход у провайдера, кроме самого входа: привязать способ к аккаунту, который уже вошёл
 * (`userId` берётся из сессии на старте, не из запроса), принять приглашение сотрудника или завести
 * клуб. Проверяется на старте и едет в подписанном state — подменить его по пути нельзя.
 */
export type IdentityIntent =
    | { kind: "link"; userId: string }
    | { kind: "invitation"; token: string }
    | { kind: "club_signup" };

/** Токен приглашения — hex из `randomBytes`; всё остальное отбрасывается до провайдера. */
const INVITATION_TOKEN = /^[a-f0-9]{16,128}$/;

/** id аккаунта — UUID: в state для привязки ничего другого не попадает. */
const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Намерение известного вида с данными правильной формы, иначе — обычный вход. */
export const sanitizeIntent = (intent: unknown): IdentityIntent | undefined => {
    if (typeof intent !== "object" || intent === null) return undefined;
    const { kind, userId, token } = intent as Record<string, unknown>;
    if (kind === "club_signup") return { kind };
    if (kind === "link" && typeof userId === "string" && ACCOUNT_ID.test(userId)) {
        return { kind, userId };
    }
    if (kind === "invitation" && typeof token === "string" && INVITATION_TOKEN.test(token)) {
        return { kind, token };
    }
    return undefined;
};

/** Намерение из параметров старта (`?intent=invitation&token=…`); привязка так не начинается. */
export const intentFromQuery = (
    kind: string | undefined,
    token: string | undefined
): IdentityIntent | undefined => (kind === "link" ? undefined : sanitizeIntent({ kind, token }));

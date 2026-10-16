import { IdentityProvider } from "@prisma/client";

import type { LinkIdentityInput } from "./repositories/user-identity-repository.interface";
import type { TelegramProfile } from "./telegram-auth";

/** Привязка Telegram: почты у провайдера нет, имя и @username — для показа. */
export const telegramIdentity = (userId: string, profile: TelegramProfile): LinkIdentityInput => ({
    userId,
    provider: IdentityProvider.telegram,
    providerUserId: profile.telegramId,
    emailVerified: false,
    displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
    givenName: profile.firstName,
    familyName: profile.lastName,
    username: profile.username,
});

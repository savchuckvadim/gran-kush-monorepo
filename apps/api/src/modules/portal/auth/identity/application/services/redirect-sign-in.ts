import type { ExternalProfile } from "../../domain/identity-provider";

import type { VerifiedCallback } from "./oauth-redirect-flow.types";

/** Куда отправить браузер после возврата от провайдера и кому выдать сессию, если вход состоялся. */
export interface RedirectSignInResult {
    redirect: string;
    sessionUserId?: string;
}

/** Что делает аудитория с проверенным профилем после редиректа: вход, привязка, приглашение… */
export interface RedirectSignInCompletion {
    complete(profile: ExternalProfile, verified: VerifiedCallback): Promise<RedirectSignInResult>;
}

import type {
    SchemaAccountSecurityDto,
    SchemaAccountSessionDto,
    SchemaChangeAccountPasswordDto,
    SchemaIdentityProviderDto,
} from "@workspace/api-client/core";

/** Способы входа аккаунта: задан ли пароль и провайдеры (`methods[]`) из реестра API. */
export type AccountSecurity = SchemaAccountSecurityDto;
export type SignInMethod = AccountSecurity["methods"][number];
export type SignInProvider = SchemaIdentityProviderDto;
export type SignInProviderKey = SignInProvider["key"];
export type AccountSession = SchemaAccountSessionDto;

/** Подписанный ответ виджета провайдера (Telegram) — уходит в API как есть. */
export type WidgetPayload = Record<string, unknown>;

/** Приложение, из которого открыт «Вход и безопасность». */
export type AccountAudience = "crm" | "cabinet";

/**
 * «Вход и безопасность» одного приложения (TASK-738): маршруты `/{aud}/account/*` и
 * `/{aud}/auth/*` у CRM и кабинета одинаковы, отличаются клиент и куки. Виджет берёт клиента из
 * `AccountSecurityContext` и не знает, в каком приложении открыт.
 */
export interface AccountSecurityClient {
    audience: AccountAudience;
    getSecurity(): Promise<AccountSecurity>;
    setPassword(body: SchemaChangeAccountPasswordDto): Promise<AccountSecurity>;
    linkWidget(input: {
        provider: SignInProviderKey;
        payload: WidgetPayload;
    }): Promise<AccountSecurity>;
    unlink(provider: SignInProviderKey): Promise<AccountSecurity>;
    signOutEverywhere(): Promise<void>;
    listSessions(): Promise<AccountSession[]>;
    endSession(id: string): Promise<void>;
    endOtherSessions(): Promise<number>;
    listProviders(): Promise<SignInProvider[]>;
    /** Адрес привязки редирект-провайдера: API уводит к провайдеру и возвращает на эту страницу */
    linkUrl(provider: SignInProviderKey, locale: string): string;
}

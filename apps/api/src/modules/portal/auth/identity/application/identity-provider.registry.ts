import { Inject, Injectable } from "@nestjs/common";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../domain/identity-error";
import {
    type IdentityProviderAdapter,
    type IdentityProviderKey,
    isIdentityProviderKey,
    type ProviderPublicConfig,
    type RedirectIdentityProvider,
    type WidgetIdentityProvider,
} from "../domain/identity-provider";

/** DI-токен списка адаптеров: модуль собирает их в `useFactory`, реестр раздаёт по ключу. */
export const IDENTITY_PROVIDERS = Symbol("IDENTITY_PROVIDERS");

export interface EnabledIdentityProvider {
    key: IdentityProviderKey;
    flow: IdentityProviderAdapter["flow"];
    config: ProviderPublicConfig;
}

/**
 * Реестр способов входа. Маршруты `/{aud}/auth/{provider}/…` берут адаптер отсюда: неизвестный
 * провайдер — `unknown`, не настроенный для аудитории или не того вида — `off`.
 */
@Injectable()
export class IdentityProviderRegistry {
    private readonly byKey: Map<IdentityProviderKey, IdentityProviderAdapter>;

    constructor(@Inject(IDENTITY_PROVIDERS) adapters: IdentityProviderAdapter[]) {
        this.byKey = new Map(adapters.map((adapter) => [adapter.key, adapter]));
    }

    /** Кнопки входа аудитории в порядке регистрации адаптеров. */
    enabled(audience: SessionAudience): EnabledIdentityProvider[] {
        return [...this.byKey.values()]
            .filter((adapter) => adapter.isEnabled(audience))
            .map((adapter) => ({
                key: adapter.key,
                flow: adapter.flow,
                config: adapter.publicConfig(audience),
            }));
    }

    /** Все известные провайдеры и доступны ли они аудитории — для «Вход и безопасность». */
    all(
        audience: SessionAudience
    ): { key: IdentityProviderKey; flow: IdentityProviderAdapter["flow"]; available: boolean }[] {
        return [...this.byKey.values()].map((adapter) => ({
            key: adapter.key,
            flow: adapter.flow,
            available: adapter.isEnabled(audience),
        }));
    }

    redirect(key: string, audience: SessionAudience): RedirectIdentityProvider {
        const adapter = this.get(key, audience);
        if (adapter.flow !== "redirect") throw new IdentityError("off", adapter.key);
        return adapter;
    }

    widget(key: string, audience: SessionAudience): WidgetIdentityProvider {
        const adapter = this.get(key, audience);
        if (adapter.flow !== "widget") throw new IdentityError("off", adapter.key);
        return adapter;
    }

    /** Ключ провайдера из адреса, если он известен; иначе `unknown`. */
    keyOf(key: string): IdentityProviderKey {
        if (!isIdentityProviderKey(key) || !this.byKey.has(key)) {
            throw new IdentityError("unknown");
        }
        return key;
    }

    private get(key: string, audience: SessionAudience): IdentityProviderAdapter {
        const adapter = this.byKey.get(this.keyOf(key));
        if (!adapter?.isEnabled(audience)) throw new IdentityError("off", this.keyOf(key));
        return adapter;
    }
}

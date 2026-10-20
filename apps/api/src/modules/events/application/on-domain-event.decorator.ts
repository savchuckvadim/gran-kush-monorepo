import { SetMetadata } from "@nestjs/common";

import type { EventName } from "@workspace/domain-events";

import { DOMAIN_EVENT_HANDLER_METADATA } from "../events.constants";

/**
 * Метод провайдера — потребитель событий. Имя потребителя — класс; одна доставка на пару
 * «событие × класс», метод получает конверт `DomainEvent<N>`. Исключение из метода — повтор
 * по правилам очереди, поэтому метод обязан быть идемпотентным.
 */
export const OnDomainEvent = (...names: readonly EventName[]): MethodDecorator =>
    SetMetadata(DOMAIN_EVENT_HANDLER_METADATA, names);

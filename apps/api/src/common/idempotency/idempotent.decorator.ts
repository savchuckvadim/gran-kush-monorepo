import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";

import {
    IDEMPOTENCY_HEADER,
    IDEMPOTENCY_SCOPE_METADATA,
    IdempotencyScope,
} from "./idempotency.constants";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

/**
 * Повтор с тем же `Idempotency-Key` возвращает сохранённый ответ вместо второго выполнения.
 *
 * Заголовок опционален — без него маршрут ведёт себя как раньше. Маршрут обязан быть
 * аутентифицированным: ключ уникален в пределах владельца, а не глобально.
 */
export const Idempotent = (scope: IdempotencyScope) =>
    applyDecorators(
        SetMetadata(IDEMPOTENCY_SCOPE_METADATA, scope),
        UseInterceptors(IdempotencyInterceptor),
        ApiHeader({
            name: IDEMPOTENCY_HEADER,
            required: false,
            description:
                "Ключ идемпотентности. Повтор с тем же ключом и тем же телом возвращает " +
                "сохранённый ответ вместо повторного выполнения. " +
                "Тот же ключ с другим телом → 422, ключ ещё в работе → 409.",
        }),
        ApiErrorResponse([409, 422])
    );

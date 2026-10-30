import {
    applyDecorators,
    HttpCode,
    HttpStatus,
    SetMetadata,
    UseInterceptors,
} from "@nestjs/common";
import { ApiAcceptedResponse, ApiHeader, ApiServiceUnavailableResponse } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiErrorResponseDto } from "@common/dto/api-error-response.dto";
import { IDEMPOTENCY_HEADER } from "@common/idempotency";

import type { OperationDefinition } from "../domain/operation";
import { BACKGROUND_OPERATION_METADATA } from "../operations.constants";

import { BackgroundOperationInterceptor } from "./background-operation.interceptor";
import { OperationAcceptedDto } from "./dto/operation.dto";

/**
 * Маршрут выполняется в фоне (TASK-809). Обработчик возвращает вход операции (JSON-объект без
 * файлов и персональных данных), ответ — 202 `{ operationId }`; работу делает класс с
 * `@RunsOperation(definition)`. Ставится под `@CrmAuth` и `@RequirePermission`: проверки прав и
 * DTO остаются в запросе.
 */
export const BackgroundOperation = (definition: OperationDefinition) =>
    applyDecorators(
        SetMetadata(BACKGROUND_OPERATION_METADATA, definition.kind),
        UseInterceptors(BackgroundOperationInterceptor),
        HttpCode(HttpStatus.ACCEPTED),
        ApiAcceptedResponse({
            description: `Операция «${definition.kind}» принята: ${definition.description}`,
            type: OperationAcceptedDto,
        }),
        ApiHeader({
            name: IDEMPOTENCY_HEADER,
            required: false,
            description:
                "Ключ идемпотентности. Повтор с тем же ключом и тем же входом возвращает ту же " +
                "операцию; тот же ключ с другим входом → 422.",
        }),
        ApiErrorResponse([422]),
        ApiServiceUnavailableResponse({
            description: "Очередь операций недоступна — повторить позже",
            type: ApiErrorResponseDto,
        })
    );

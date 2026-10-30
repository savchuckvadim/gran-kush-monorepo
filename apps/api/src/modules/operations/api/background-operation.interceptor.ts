import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Request } from "express";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { IDEMPOTENCY_HEADER, IDEMPOTENCY_KEY_MAX_LENGTH } from "@common/idempotency";

import { OperationsService } from "../application/operations.service";
import type { JsonObject } from "../domain/operation";
import { BACKGROUND_OPERATION_METADATA } from "../operations.constants";

import type { OperationAcceptedDto } from "./dto/operation.dto";

/** Вход операции — то, что вернул маршрут: сериализуется как JSON, `undefined` и даты — как в ответе. */
const toJsonObject = (value: unknown): JsonObject => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InternalServerErrorException(
            "Background operation route must return the operation input as an object"
        );
    }
    return JSON.parse(JSON.stringify(value)) as JsonObject;
};

/**
 * Маршрут с `@BackgroundOperation` не выполняет работу: гварды и пайпы проверяют права и DTO как
 * обычно (401, 403, 400 сразу), обработчик возвращает вход операции, а интерцептор заводит
 * операцию и отвечает 202 `{ operationId }`. Повтор с тем же `Idempotency-Key` — та же операция.
 */
@Injectable()
export class BackgroundOperationInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly operations: OperationsService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const kind = this.reflector.get<string | undefined>(
            BACKGROUND_OPERATION_METADATA,
            context.getHandler()
        );
        if (!kind) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();
        const portalId = request.portalContext?.portalId;
        const principal = request.principal;
        if (!portalId || !principal || principal.principalType !== "employee") {
            // декоратор без `@CrmAuth` — ошибка конфигурации маршрута, а не клиента
            throw new InternalServerErrorException(
                "Background operation route requires an employee of a portal"
            );
        }
        const idempotencyKey = request.header(IDEMPOTENCY_HEADER)?.trim() || null;
        if (idempotencyKey && idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
            throw new BadRequestException(
                `Idempotency-Key длиннее ${IDEMPOTENCY_KEY_MAX_LENGTH} символов`
            );
        }

        return next.handle().pipe(
            mergeMap(async (input: unknown): Promise<OperationAcceptedDto> => {
                const operation = await this.operations.enqueue({
                    kind,
                    portalId,
                    employeeId: principal.membershipId,
                    input: toJsonObject(input),
                    idempotencyKey,
                });
                return { operationId: operation.id };
            })
        );
    }
}

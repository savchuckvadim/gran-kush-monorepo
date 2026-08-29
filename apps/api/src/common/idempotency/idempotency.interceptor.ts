import {
    BadRequestException,
    CallHandler,
    ConflictException,
    ExecutionContext,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    Logger,
    NestInterceptor,
    UnprocessableEntityException,
} from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";

import type { Request } from "express";
import { from, Observable, of, throwError } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";

import {
    IDEMPOTENCY_HEADER,
    IDEMPOTENCY_KEY_MAX_LENGTH,
    IDEMPOTENCY_SCOPE_METADATA,
} from "./idempotency.constants";
import { IdempotencyIdentity, IdempotencyService } from "./idempotency.service";

/**
 * Повтор запроса с тем же `Idempotency-Key` возвращает сохранённый ответ вместо
 * второго выполнения. Навешивается декоратором {@link Idempotent}.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    private readonly logger = new Logger(IdempotencyInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly idempotency: IdempotencyService
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const scope = this.reflector.getAllAndOverride<string | undefined>(
            IDEMPOTENCY_SCOPE_METADATA,
            [context.getHandler(), context.getClass()]
        );
        if (!scope) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest<Request>();
        const key = req.header(IDEMPOTENCY_HEADER)?.trim();
        // Заголовок опционален: без него маршрут работает как раньше.
        if (!key) {
            return next.handle();
        }
        if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
            throw new BadRequestException(
                `Idempotency-Key длиннее ${IDEMPOTENCY_KEY_MAX_LENGTH} символов`
            );
        }

        const identity: IdempotencyIdentity = {
            scope,
            ownerKey: this.resolveOwnerKey(req),
            key,
        };
        const requestHash = this.idempotency.hashRequest(req.body);
        const outcome = await this.idempotency.acquire(identity, requestHash);

        switch (outcome.kind) {
            case "replay":
                // HTTP-статус повтора Nest выводит из тех же метаданных маршрута, что и у
                // оригинала, поэтому переставлять его здесь не нужно; сохранённый statusCode
                // делает строку журнала самодостаточной при разборе.
                return of(outcome.response);
            case "mismatch":
                throw new UnprocessableEntityException(
                    "Idempotency-Key уже использован с другим телом запроса"
                );
            case "in_progress":
                throw new ConflictException(
                    "Запрос с этим Idempotency-Key ещё выполняется, повторите позже"
                );
            case "acquired":
                break;
        }

        const statusCode = this.resolveStatusCode(context, req);

        return next.handle().pipe(
            mergeMap(async (result: unknown) => {
                await this.idempotency.complete(identity, statusCode, result);
                return result;
            }),
            catchError((error: unknown) =>
                from(this.releaseQuietly(identity)).pipe(mergeMap(() => throwError(() => error)))
            )
        );
    }

    /**
     * Ключ уникален только внутри своего владельца: одинаковое значение заголовка
     * у двух клубов не должно отдавать одному ответ другого.
     */
    private resolveOwnerKey(req: Request): string {
        const principal = req.principal;
        if (!principal) {
            // @Idempotent на маршруте без аутентификации — ошибка конфигурации, а не клиента:
            // владельца ключа нет, и разделить клиентов между собой нечем.
            throw new InternalServerErrorException(
                "Idempotent route requires an authenticated principal"
            );
        }
        return `${principal.portalId}:${principal.principalType}:${principal.membershipId}`;
    }

    /** Тот же вывод статуса, что делает Nest: `@HttpCode`, иначе 201 для POST и 200 для остальных. */
    private resolveStatusCode(context: ExecutionContext, req: Request): number {
        const explicit = this.reflector.get<number | undefined>(
            HTTP_CODE_METADATA,
            context.getHandler()
        );
        if (explicit) {
            return explicit;
        }
        return req.method === "POST" ? HttpStatus.CREATED : HttpStatus.OK;
    }

    /** Ошибка снятия ключа не должна маскировать исходную ошибку запроса. */
    private async releaseQuietly(identity: IdempotencyIdentity): Promise<void> {
        try {
            await this.idempotency.release(identity);
        } catch (releaseError: unknown) {
            this.logger.error(
                `Failed to release idempotency key ${identity.scope}:${identity.key}`,
                releaseError instanceof Error ? releaseError.stack : String(releaseError)
            );
        }
    }
}

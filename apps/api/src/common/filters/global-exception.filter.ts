import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";

import type { Request, Response } from "express";

/** Тело любой ошибки API — контракт в documentation/backend/HTTP_API_CONTRACT.md */
export interface ApiErrorBody {
    message: string;
    errors: string[];
    [extra: string]: unknown;
}

const INTERNAL_ERROR_MESSAGE = "Internal server error";
const VALIDATION_FAILED_MESSAGE = "Validation failed";

/** Служебные поля штатного формата Nest `{ statusCode, message, error }` — наружу не идут */
const NEST_RESPONSE_KEYS = new Set(["statusCode", "error", "message", "errors"]);

/** Ошибки express-мидлварей (body-parser и прочие `http-errors`): статус лежит в самом объекте */
interface HttpLikeError {
    statusCode?: unknown;
    status?: unknown;
    expose?: unknown;
    message?: unknown;
}

const httpLikeStatus = (exception: unknown): number | undefined => {
    if (typeof exception !== "object" || exception === null) {
        return undefined;
    }
    const { statusCode, status } = exception as HttpLikeError;
    const candidate = typeof statusCode === "number" ? statusCode : status;
    return typeof candidate === "number" && candidate >= 400 && candidate <= 599
        ? candidate
        : undefined;
};

const toStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : [];

const fromHttpException = (exception: HttpException): ApiErrorBody => {
    const res: unknown = exception.getResponse();
    if (typeof res !== "object" || res === null) {
        return { message: String(res), errors: [] };
    }

    const { message, errors } = res as { message?: unknown; errors?: unknown };
    // Поля вроде `checks` у readiness-ответа остаются рядом с message/errors
    const extra = Object.fromEntries(
        Object.entries(res).filter(([key]) => !NEST_RESPONSE_KEYS.has(key))
    );

    // ValidationPipe кладёт в message массив нарушений — это и есть `errors` контракта
    if (Array.isArray(message)) {
        return { ...extra, message: VALIDATION_FAILED_MESSAGE, errors: toStrings(message) };
    }

    return {
        ...extra,
        message: typeof message === "string" && message.length > 0 ? message : exception.message,
        errors: toStrings(errors),
    };
};

const describeException = (exception: unknown): { status: number; body: ApiErrorBody } => {
    if (exception instanceof HttpException) {
        return { status: exception.getStatus(), body: fromHttpException(exception) };
    }

    const status = httpLikeStatus(exception);
    if (status !== undefined) {
        const { expose, message } = exception as HttpLikeError;
        // body-parser выставляет expose: true на 4xx (413 entity.too.large, 400 entity.parse.failed)
        const exposed = status < 500 && expose !== false && typeof message === "string";
        return {
            status,
            body: { message: exposed ? message : INTERNAL_ERROR_MESSAGE, errors: [] },
        };
    }

    // Всё прочее — 500 без деталей: текст исключения может содержать SQL, пути и ключи
    return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { message: INTERNAL_ERROR_MESSAGE, errors: [] },
    };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { status, body } = describeException(exception);
        this.log(exception, status, body, request);

        if (response.headersSent) {
            response.end();
            return;
        }
        response.status(status).json(body);
    }

    private log(exception: unknown, status: number, body: ApiErrorBody, request: Request): void {
        const line = `${request.method} ${request.originalUrl} -> ${status} ${body.message}`;

        if (status >= 500) {
            const stack = exception instanceof Error ? exception.stack : String(exception);
            this.logger.error(line, stack);
            return;
        }
        if (body.errors.length > 0) {
            this.logger.warn(`${line}: ${body.errors.join("; ")}`);
            return;
        }
        this.logger.debug(line);
    }
}

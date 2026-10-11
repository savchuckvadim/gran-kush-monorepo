import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Тело запроса ровно как пришло — для проверки подписи вебхуков. Работает на маршрутах,
 * где body-parser.config.ts ставит `raw()`: там `req.body` — Buffer, а не разобранный JSON.
 */
export const RawBody = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ body?: unknown }>();
    return Buffer.isBuffer(request.body) ? request.body.toString("utf8") : "";
});

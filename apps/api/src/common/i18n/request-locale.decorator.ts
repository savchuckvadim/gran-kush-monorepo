import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { Request } from "express";

import { ContentLocale } from "./content-locale";
import { parseRequestLocale } from "./parse-request-locale";

/** Язык интерфейса клиента (`Accept-Language`) для перевода подписей данных. */
export const RequestLocale = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): ContentLocale =>
        parseRequestLocale(ctx.switchToHttp().getRequest<Request>().headers["accept-language"])
);

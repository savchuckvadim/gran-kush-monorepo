import { MiddlewareConsumer, RequestMethod } from "@nestjs/common";

import { json, urlencoded } from "express";

import { JSON_BODY_LIMIT, UPLOAD_JSON_BODY_LIMIT } from "@common/upload/upload.config";

/** Маршруты, принимающие файлы как base64 data URL в JSON. */
const UPLOAD_JSON_ROUTES = [
    { path: "lk/account/documents", method: RequestMethod.POST },
    { path: "lk/account/signature", method: RequestMethod.PUT },
    { path: "lk/auth/member/files", method: RequestMethod.POST },
];

/**
 * Разбор тела с разными потолками: широкий — только там, где в JSON едут файлы, узкий —
 * везде. Штатный парсер Nest один на всё приложение, поэтому в `main.ts` он выключен
 * (`bodyParser: false`), а парсеры регистрируются здесь.
 *
 * Порядок важен: body-parser пропускает уже разобранное тело (`req._body`), так что
 * широкий парсер идёт первым на своих маршрутах, а общий — следом на всех и для них
 * становится no-op. Приложение, поднятое без `bodyParser: false` (тесты), получит штатный
 * парсер на 100 КБ раньше обоих.
 */
export const configureBodyParsers = (consumer: MiddlewareConsumer): void => {
    consumer.apply(json({ limit: UPLOAD_JSON_BODY_LIMIT })).forRoutes(...UPLOAD_JSON_ROUTES);
    consumer
        .apply(
            json({ limit: JSON_BODY_LIMIT }),
            urlencoded({ extended: true, limit: JSON_BODY_LIMIT })
        )
        // Express 5 (path-to-regexp v8): голый "*" не матчит ни один путь
        .forRoutes("{*splat}");
};

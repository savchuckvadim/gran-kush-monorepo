import { applyDecorators } from "@nestjs/common";

import { Transform } from "class-transformer";
import { IsBoolean, ValidationOptions } from "class-validator";

const parseQueryBoolean = (value: unknown): unknown =>
    value === "true" ? true : value === "false" ? false : value;

/**
 * Boolean из query-string. `@Type(() => Boolean)` здесь не годится: query приходит
 * строками, а `Boolean("false") === true`. Строки "true"/"false" становятся boolean,
 * всё остальное уходит в `@IsBoolean()` как есть и даёт 400.
 */
export const IsQueryBoolean = (options?: ValidationOptions): PropertyDecorator =>
    applyDecorators(
        Transform(({ value }) => parseQueryBoolean(value)),
        IsBoolean(options)
    );

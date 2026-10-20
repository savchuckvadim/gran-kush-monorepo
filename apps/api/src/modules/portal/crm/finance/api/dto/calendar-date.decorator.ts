import { applyDecorators } from "@nestjs/common";

import { IsISO8601, Matches } from "class-validator";

const CALENDAR_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** Дата без времени `YYYY-MM-DD`, которая есть в календаре: `2026-02-30` не пройдёт. */
export const IsCalendarDate = (): PropertyDecorator =>
    applyDecorators(
        Matches(CALENDAR_DATE, { message: "$property must be a date YYYY-MM-DD" }),
        IsISO8601({ strict: true }, { message: "$property must be an existing date" })
    );

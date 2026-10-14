import { Prisma } from "@prisma/client";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const strings = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
};

const at = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);

/**
 * Columns (and the constraint name) of the unique index a P2002 error hit; `null` for any other
 * error. Prisma 7 with the pg driver adapter no longer fills `meta.target`: the columns sit in
 * `meta.driverAdapterError.cause.constraint.fields`. Both shapes are read, so a retry on a
 * duplicate never silently turns into a 500 again.
 */
export const uniqueViolationFields = (error: unknown): string[] | null => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return null;
    }
    const cause = at(at(error.meta, "driverAdapterError"), "cause");
    return [
        ...strings(at(error.meta, "target")),
        ...strings(at(at(cause, "constraint"), "fields")),
        ...strings(at(at(cause, "constraint"), "index")),
        ...strings(at(cause, "originalMessage")),
    ];
};

/** A unique violation on an index that covers `column` (or whose name mentions it). */
export const isUniqueViolationOn = (error: unknown, column: string): boolean =>
    (uniqueViolationFields(error) ?? []).some((field) => field.includes(column));

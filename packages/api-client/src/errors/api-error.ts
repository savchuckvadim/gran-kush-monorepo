/**
 * Matches Nest `GlobalExceptionFilter` JSON (`message`, optional `errors`)
 * and validation responses where `message` may be string | string[].
 */
export type ApiErrorBody = {
    message?: string | string[];
    errors?: string[] | string;
    /** Machine-readable reason next to the human message, when the API gives one (e.g. `email_taken`). */
    code?: string;
};

/** The `code` of an API error, for reasons the UI answers differently than with the message. */
export function getApiErrorCode(error: unknown): string | undefined {
    if (!(error instanceof ApiClientError)) return undefined;
    const code = (error.body as ApiErrorBody | undefined)?.code;
    return typeof code === "string" ? code : undefined;
}

export class ApiClientError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body: unknown;

    constructor(message: string, status: number, statusText: string, body: unknown) {
        super(message);
        this.name = "ApiClientError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}

/**
 * Prefer `errors` when present and non-empty (validation / field messages).
 * Otherwise use `message` (human summary or single error).
 */
export function formatApiErrorMessage(body: ApiErrorBody | null | undefined): string {
    if (!body) {
        return "Request failed";
    }

    const rawErrors = body.errors;
    if (Array.isArray(rawErrors) && rawErrors.length > 0) {
        return rawErrors.join("\n");
    }
    if (typeof rawErrors === "string" && rawErrors.trim().length > 0) {
        return rawErrors;
    }

    const msg = body.message;
    if (Array.isArray(msg) && msg.length > 0) {
        return msg.join("\n");
    }
    if (typeof msg === "string" && msg.trim().length > 0) {
        return msg;
    }

    return "Request failed";
}

export async function parseApiErrorFromResponse(response: Response): Promise<ApiClientError> {
    const status = response.status;
    const statusText = response.statusText;
    let body: unknown;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        try {
            body = await response.json();
        } catch {
            body = undefined;
        }
    }

    const message = formatApiErrorMessage(body as ApiErrorBody);
    return new ApiClientError(message, status, statusText, body);
}

type OpenApiResult<T> = {
    response: Response;
    data?: T;
    error?: unknown;
};

/**
 * Throws {@link ApiClientError} with parsed message if `response.ok` is false.
 * Returns `data` when OK (caller should still validate shape if needed).
 *
 * openapi-fetch has already read the body of a failed response into `error` (a 401 that the
 * auth middleware let through after a refresh attempt lands here too); reading the response
 * again would fail and the message would degrade to "Request failed".
 */
export async function assertOpenApiOk<T>(result: OpenApiResult<T>): Promise<T> {
    if (!result.response.ok) {
        if (result.error !== undefined) {
            throw new ApiClientError(
                formatApiErrorMessage(result.error as ApiErrorBody),
                result.response.status,
                result.response.statusText,
                result.error
            );
        }
        throw await parseApiErrorFromResponse(result.response);
    }
    return result.data as T;
}

export function getApiErrorMessage(error: unknown): string {
    if (error instanceof ApiClientError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}

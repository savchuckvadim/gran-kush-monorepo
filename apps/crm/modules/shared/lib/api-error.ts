/**
 * Helper functions for handling API errors from openapi-fetch
 */

/**
 * Checks if an error is an API error with a specific status code
 */
export function isApiErrorWithStatus(error: unknown, status: number): boolean {
    if (error && typeof error === "object" && "response" in error) {
        const apiError = error as { response?: { status?: number } };
        return apiError.response?.status === status;
    }
    return false;
}

/**
 * Gets the status code from an API error, if available
 */
export function getApiErrorStatus(error: unknown): number | null {
    if (error && typeof error === "object" && "response" in error) {
        const apiError = error as { response?: { status?: number } };
        return apiError.response?.status ?? null;
    }
    return null;
}

/**
 * Gets the error message from an API error, if available
 */
export function getApiErrorMessage(error: unknown): string | null {
    if (error && typeof error === "object") {
        if ("message" in error && typeof error.message === "string") {
            return error.message;
        }
        if ("response" in error) {
            const apiError = error as { response?: { statusText?: string } };
            return apiError.response?.statusText ?? null;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return null;
}

import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";

/**
 * Show a toast for any thrown API/network error (uses centralized message parsing).
 */
export function notifyApiError(error: unknown, title?: string): void {
    const message = getApiErrorMessage(error);
    if (title) {
        toast.error(title, { description: message });
    } else {
        toast.error(message);
    }
}

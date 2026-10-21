import { type NextRequest, NextResponse } from "next/server";

import { clearPlatformSession, endPlatformSession } from "@/modules/shared/server/platform-session";

/** Выход: API гасит сессию по refresh из cookie, затем cookie стираются. */
export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
    await endPlatformSession(request);
    const response = new NextResponse(null, { status: 204 });
    clearPlatformSession(response);
    return response;
};

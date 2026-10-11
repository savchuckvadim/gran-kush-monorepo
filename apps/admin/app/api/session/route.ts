import { NextResponse } from "next/server";

import { clearPlatformSession } from "@/modules/shared/server/platform-session";

/** Выход: у платформенного JWT нет refresh-токена на сервере, достаточно стереть cookie. */
export const DELETE = (): NextResponse => {
    const response = new NextResponse(null, { status: 204 });
    clearPlatformSession(response);
    return response;
};

import { type NextRequest, NextResponse } from "next/server";

const CRM_ACCESS_COOKIE = "crm_access_token";

export function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;
    const segments = pathname.split("/").filter(Boolean);

    // segments: [locale, portal?, section?, ...]
    const locale = segments[0];
    const second = segments[1]; // portal slug or "auth"
    const third = segments[2]; // "crm", "auth", "scan", "member", ...

    const hasAuthCookie = request.cookies.has(CRM_ACCESS_COOKIE);

    // [locale]/[portal]/crm/* and [locale]/[portal]/scan — protected
    if (second && second !== "auth" && (third === "crm" || third === "scan" || third === "member")) {
        if (!hasAuthCookie) {
            const loginUrl = new URL(`/${locale}/${second}/auth/login`, request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // [locale]/[portal]/auth/* — redirect to CRM if already authenticated
    if (second && second !== "auth" && third === "auth" && hasAuthCookie) {
        return NextResponse.redirect(new URL(`/${locale}/${second}/crm`, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|favicon\\.ico|api|.*\\..*).*)"],
};

import { type NextRequest, NextResponse } from "next/server";

import { allowLead } from "@/modules/lead/rate-limit";
import { leadSchema } from "@/modules/lead/schema";
import { hasLeadChannel, sendLead } from "@/modules/lead/send-lead";

const clientIp = (request: NextRequest) =>
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

/**
 * Accepts a contact-form request. Answers: 200 sent; 400 invalid; 429 too many from one address;
 * 503 no delivery channel configured or every channel failed. A honeypot hit answers 200 and
 * drops the request, so a bot learns nothing.
 */
export async function POST(request: NextRequest) {
    if (!hasLeadChannel()) {
        return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    const ip = clientIp(request);
    if (!allowLead(ip)) {
        return NextResponse.json({ error: "too_many" }, { status: 429 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (parsed.data.website) {
        return NextResponse.json({ ok: true });
    }

    try {
        await sendLead(parsed.data, ip);
    } catch (error) {
        console.error("lead delivery failed", error);
        return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
}

import { REDACTED, redactUrl } from "../redact-url";

describe("redactUrl", () => {
    it.each([
        ["/public/invitations/abc123", `/public/invitations/${REDACTED}`],
        ["/public/invitations/abc123/accept", `/public/invitations/${REDACTED}/accept`],
        ["/crm/auth/invitations/abc123/accept", `/crm/auth/invitations/${REDACTED}/accept`],
        ["/cabinet/invitations/abc123/accept", `/cabinet/invitations/${REDACTED}/accept`],
        ["/public/consent/abc123/confirm", `/public/consent/${REDACTED}/confirm`],
        ["/public/reg-links/abc123/register", `/public/reg-links/${REDACTED}/register`],
        ["/cabinet/reg-links/abc123/join", `/cabinet/reg-links/${REDACTED}/join`],
    ])("токен в пути %s вырезан", (url, expected) => {
        expect(redactUrl(url)).toBe(expected);
    });

    it("секретные значения query заменены, остальные остаются", () => {
        expect(redactUrl("/crm/auth/google/callback?code=xyz&state=s1&error=denied")).toBe(
            `/crm/auth/google/callback?code=${REDACTED}&state=${REDACTED}&error=denied`
        );
        expect(redactUrl("/auth/verify?token=t1&lang=es")).toBe(
            `/auth/verify?token=${REDACTED}&lang=es`
        );
    });

    it("обычные маршруты не меняются", () => {
        expect(redactUrl("/crm/orders?page=2&limit=20")).toBe("/crm/orders?page=2&limit=20");
        expect(redactUrl("/crm/members/7f0c")).toBe("/crm/members/7f0c");
    });

    it("префикс в середине чужого пути не срабатывает на соседний сегмент", () => {
        expect(redactUrl("/crm/public/invitations-list")).toBe("/crm/public/invitations-list");
    });
});

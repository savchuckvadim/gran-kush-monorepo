import { API_BASE_URL } from "./api";

/** Who signs in: the CRM (employee session) or the member cabinet. */
export type GoogleSignInApp = "crm" | "cabinet";

/** What the sign-in is for besides signing in; the API checks it and signs it into the OAuth state. */
export type GoogleSignInIntent = { kind: "invitation"; token: string } | { kind: "club_signup" };

/**
 * Address that starts the Google flow on the API. `returnTo` is a path on the same frontend; the API
 * accepts only safe relative paths and replaces anything else with the default page.
 */
export const googleSignInUrl = (
    app: GoogleSignInApp,
    options: { locale: string; returnTo?: string; intent?: GoogleSignInIntent }
): string => {
    const query = new URLSearchParams({ locale: options.locale });
    if (options.returnTo) query.set("returnTo", options.returnTo);
    if (options.intent) {
        query.set("intent", options.intent.kind);
        if (options.intent.kind === "invitation") query.set("token", options.intent.token);
    }
    return `${API_BASE_URL}/${app}/auth/google/start?${query.toString()}`;
};

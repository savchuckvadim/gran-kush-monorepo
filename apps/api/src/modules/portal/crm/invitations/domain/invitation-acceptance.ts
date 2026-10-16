/** What the invitee already has under the invited email: decides how they can accept. */
export enum InvitationAccountState {
    /** No account yet: the invitee sets a password, the account signs in after confirming the email. */
    new = "new",
    /** An account with a password: accept with that password, an open session or Google. */
    password = "password",
    /** An account without a password (claimed by Google only, or created by a club): session or Google. */
    passwordless = "passwordless",
}

export enum AcceptInvitationOutcome {
    /** The employee exists and the CRM session cookies are set. */
    accepted = "accepted",
    /** A new account and the employee exist; the session comes after the email is confirmed. */
    accepted_pending_email = "accepted_pending_email",
    /** The account's email is not confirmed: the confirmation was sent again, nothing was accepted. */
    confirm_email_first = "confirm_email_first",
    /** The account has no password: a link to set one was sent, nothing was accepted. */
    password_setup_sent = "password_setup_sent",
}

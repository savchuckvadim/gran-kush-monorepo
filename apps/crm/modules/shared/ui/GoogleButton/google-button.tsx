import { Button } from "@workspace/ui";

import { GoogleMark } from "./google-mark";

interface GoogleButtonProps {
    /** Start of the Google flow on the API (`googleSignInUrl`). */
    href: string;
    label: string;
    /** Text of the divider above the button («или»); without it the button stands alone. */
    separator?: string;
}

/**
 * «Войти через Google» — an ordinary link, not a fetch: the API answers with redirects and sets
 * the session cookies in its callback.
 */
export function GoogleButton({ href, label, separator }: GoogleButtonProps) {
    return (
        <div className="space-y-4">
            {separator && (
                <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    {separator}
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                </div>
            )}
            <Button type="button" variant="outline" className="w-full" asChild>
                <a href={href}>
                    <GoogleMark />
                    {label}
                </a>
            </Button>
        </div>
    );
}

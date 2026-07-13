// Force dynamic rendering to avoid cache conflicts
export const dynamic = "force-dynamic";

// Variant A — Onboarding routes (no portal slug yet).
// These pages are reached before the user has a portal:
//   /[locale]/auth/login    — generic entry: asks for portal slug, then redirects to /[locale]/[portal]/auth/login
//   /[locale]/auth/register — create a new portal/account via POST /platform/portals/register
//   /[locale]/auth/confirm-email — email confirmation before the portal slug is known
//
// Portal-specific auth lives at /[locale]/[portal]/auth/* and is used once the slug is known.

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen min-w-full flex-col items-center justify-center">
            {children}
        </div>
    );
}

import { MemberConsentPage } from "@/modules/pages/member-consent";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <MemberConsentPage token={token} />;
}

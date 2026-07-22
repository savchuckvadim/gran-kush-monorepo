import { InviteAcceptPage } from "@/modules/pages/invite-accept";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <InviteAcceptPage token={token} />;
}

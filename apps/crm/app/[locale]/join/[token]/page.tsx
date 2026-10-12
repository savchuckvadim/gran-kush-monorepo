import { JoinByLinkPage } from "@/modules/pages/join-by-link";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <JoinByLinkPage token={token} />;
}

import { MemberQrPrintPage } from "@/modules/pages/member-qr-print";

export default async function Page({ params }: { params: Promise<{ memberId: string }> }) {
    const { memberId } = await params;
    return <MemberQrPrintPage memberId={memberId} />;
}

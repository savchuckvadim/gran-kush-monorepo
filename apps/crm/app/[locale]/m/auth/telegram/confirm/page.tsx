import { MemberAuthCard, MemberConfirmTelegram } from "@/modules/features/member-auth";

export default async function MemberConfirmTelegramPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    return (
        <MemberAuthCard section="telegram">
            <MemberConfirmTelegram token={token ?? ""} />
        </MemberAuthCard>
    );
}

import { MemberAuthCard, MemberConfirmEmail } from "@/modules/features/member-auth";

export default async function MemberConfirmEmailPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <MemberAuthCard section="confirm">
            <MemberConfirmEmail token={token} />
        </MemberAuthCard>
    );
}

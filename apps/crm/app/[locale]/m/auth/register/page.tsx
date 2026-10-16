import { MemberAuthCard, MemberRegisterForm } from "@/modules/features/member-auth";

export default function MemberRegisterPage() {
    return (
        <MemberAuthCard section="register">
            <MemberRegisterForm />
        </MemberAuthCard>
    );
}

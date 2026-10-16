import { Suspense } from "react";

import { MemberAuthCard, MemberResetPasswordForm } from "@/modules/features/member-auth";

export default function MemberResetPasswordPage() {
    return (
        <MemberAuthCard section="reset">
            <Suspense>
                <MemberResetPasswordForm />
            </Suspense>
        </MemberAuthCard>
    );
}

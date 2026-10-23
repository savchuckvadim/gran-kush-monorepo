import type { CrmMemberDetails } from "@/modules/entities/member";
import { brandHas } from "@/modules/shared/config/brand";

import { MemberDocuments } from "../../documents/MemberDocuments";
import { MemberQrCodeCard } from "../../qr-code/MemberQrCodeCard";

export function MemberDocumentsTab({ member }: { member: CrmMemberDetails }) {
    // QR участника — для двери клуба; без неё (студии) остаются только документы
    if (!brandHas("presence")) return <MemberDocuments member={member} />;
    return (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MemberDocuments member={member} />
            <MemberQrCodeCard memberId={member.id} />
        </div>
    );
}

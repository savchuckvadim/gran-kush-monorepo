"use client";

import { useTranslations } from "next-intl";

import { usePortalRole } from "@/modules/entities/portal";
import { CreateInvitationForm } from "@/modules/features/invitations";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { InvitationsList } from "@/modules/widgets/invitations";

export function InvitationsSettingsPage() {
    const t = useTranslations("crm.invitations");
    const { isAdmin } = usePortalRole();

    return (
        <ListPage
            title={t("title")}
            description={t("subtitle")}
            create={
                isAdmin
                    ? {
                          label: t("create.button"),
                          title: t("create.title"),
                          description: t("create.description"),
                          size: "md",
                          form: ({ close }) => <CreateInvitationForm onDone={close} />,
                      }
                    : undefined
            }
        >
            <InvitationsList />
        </ListPage>
    );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button, FieldInput } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member/api/member.api";
import { useUpdateCrmMember } from "@/modules/entities/member/hooks/member.hook";

interface MemberProfileEditModalProps {
    member: CrmMemberDetails;
}

export function MemberProfileEditModal({ member }: MemberProfileEditModalProps) {
    const t = useTranslations("crm.members.editor");
    const router = useRouter();
    const pathname = usePathname();
    const updateMemberMutation = useUpdateCrmMember();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialStatuses = useMemo(
        () => ({
            isMedical: member.mjStatuses.some((status) => status.code === "medical"),
            isMj: member.mjStatuses.some((status) => status.code === "mj"),
            isRecreation: member.mjStatuses.some((status) => status.code === "recreation"),
        }),
        [member.mjStatuses]
    );

    const [profileForm, setProfileForm] = useState({
        name: member.name,
        surname: member.surname ?? "",
        phone: member.phone ?? "",
        birthday: member.birthday ? member.birthday.slice(0, 10) : "",
        membershipNumber: member.membershipNumber ?? "",
        address: member.address ?? "",
        status: member.status,
        notes: member.notes ?? "",
        documentType: member.documents[0]?.type ?? "",
        documentNumber: member.documents[0]?.number ?? "",
        ...initialStatuses,
    });

    const handleSave = async () => {
        setError(null);
        try {
            await updateMemberMutation.mutateAsync({
                memberId: member.id,
                payload: {
                    name: profileForm.name,
                    surname: profileForm.surname || undefined,
                    phone: profileForm.phone || undefined,
                    birthday: profileForm.birthday || undefined,
                    membershipNumber: profileForm.membershipNumber || undefined,
                    address: profileForm.address || undefined,
                    status: profileForm.status || undefined,
                    notes: profileForm.notes || undefined,
                    isMedical: profileForm.isMedical,
                    isMj: profileForm.isMj,
                    isRecreation: profileForm.isRecreation,
                    documentType: profileForm.documentType || null,
                    documentNumber: profileForm.documentNumber || null,
                },
            });
            setIsOpen(false);
            // Force refresh server components by pushing to the same path
            router.push(pathname);
            router.refresh();
        } catch {
            setError(t("saveError"));
        }
    };

    return (
        <>
            <Button size="icon" variant="outline" onClick={() => setIsOpen(true)} aria-label={t("startEdit")}>
                <Pencil className="h-4 w-4" />
            </Button>

            {isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-base font-medium">{t("title")}</h2>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setError(null);
                                    setIsOpen(false);
                                }}
                            >
                                {t("cancelEdit")}
                            </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <FieldInput
                                label={t("fields.name")}
                                value={profileForm.name}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                            <FieldInput
                                label={t("fields.surname")}
                                value={profileForm.surname}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, surname: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.phone")}
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                            />
                            <FieldInput
                                label={t("fields.birthday")}
                                type="date"
                                value={profileForm.birthday}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, birthday: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.membershipNumber")}
                                value={profileForm.membershipNumber}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, membershipNumber: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.status")}
                                value={profileForm.status}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, status: e.target.value }))}
                            />
                            <FieldInput
                                label={t("fields.documentType")}
                                value={profileForm.documentType}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, documentType: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.documentNumber")}
                                value={profileForm.documentNumber}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, documentNumber: e.target.value }))
                                }
                            />
                        </div>

                        <div className="mt-3">
                            <FieldInput
                                label={t("fields.address")}
                                value={profileForm.address}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                            />
                        </div>

                        <div className="mt-3">
                            <label className="mb-1 block text-sm font-medium">{t("fields.notes")}</label>
                            <textarea
                                className="w-full rounded-md border bg-background p-2 text-sm"
                                rows={3}
                                value={profileForm.notes}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isMedical}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({ ...prev, isMedical: e.target.checked }))
                                    }
                                />
                                {t("fields.isMedical")}
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isMj}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({ ...prev, isMj: e.target.checked }))
                                    }
                                />
                                {t("fields.isMj")}
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isRecreation}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            isRecreation: e.target.checked,
                                        }))
                                    }
                                />
                                {t("fields.isRecreation")}
                            </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button onClick={handleSave} disabled={updateMemberMutation.isPending}>
                                {updateMemberMutation.isPending ? t("saving") : t("saveProfile")}
                            </Button>
                        </div>

                        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}

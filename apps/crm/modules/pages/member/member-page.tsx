'use client'

import { useState } from "react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useMemberDetails } from "@/modules/entities/member";
import { MemberDocuments, MemberHeader, MemberProfileInfo, MemberQrCodeCard } from "@/modules/widgets/member";
import { MemberTimeLine } from "@/modules/widgets/member/time-line/MemberTimeLine";

export interface IMemberPageProps {
    memberId: string;
    locale: string;
    // signatureTitle: string;
    // documentsTitle: string;
    // openDocumentsRoute: string;
}
export function MemberPage({ memberId, locale, }: IMemberPageProps) {
    const { data: member, isLoading, error } = useMemberDetails(memberId);
    const [mobileMode, setMobileMode] = useState<"info" | "timeline">("info");
    const [isTimelineDescktopHidden, setIsTimelineDescktopHidden] = useState(false);



    if (isLoading) {
        return <div>Loading...</div>
    }
    if (error) {
        return <div>Error: {error.message}</div>
    }
    if (!member) {
        return <div>Member not found</div>
    }
    return (
        <div className="space-y-6 mx-auto">

            <MemberHeader member={member} locale={locale} />
            <div>
                <div className="w-full hidden  gap-2 lg:flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setIsTimelineDescktopHidden(!isTimelineDescktopHidden)}>
                        {isTimelineDescktopHidden ? "show timeline" : "hide timeline"}
                    </Button>
                </div>
            </div>
            {/* Desktop: left column (info + documents), right column (timeline). */}
            <div className="grid gap-4 lg:grid-cols-7 lg:items-start">

                <div
                    className={cn(
                        "space-y-4",
                        !isTimelineDescktopHidden ? "lg:col-span-4" : "lg:col-span-7"
                    )}
                >
                    {/* Mobile mode switcher */}
                    <div className="flex gap-2 lg:hidden">
                        <Button
                            type="button"
                            size="sm"
                            variant={mobileMode === "info" ? "default" : "outline"}
                            onClick={() => setMobileMode("info")}
                            className="flex-1"
                        >
                            Всё
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={mobileMode === "timeline" ? "default" : "outline"}
                            onClick={() => setMobileMode("timeline")}
                            className="flex-1"
                        >
                            Таймлайн
                        </Button>
                    </div>


                    {mobileMode === "info" && (
                        <div className="lg:hidden">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <MemberProfileInfo member={member} />
                                <MemberQrCodeCard memberId={memberId} />
                            </div>
                            <div className="mt-4">
                                <MemberDocuments member={member} locale={locale} />
                            </div>

                        </div>
                    )}

                    {/* Desktop always shows info column */}
                    <div className="hidden lg:block">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <MemberProfileInfo member={member} />
                            <MemberQrCodeCard memberId={memberId} />
                        </div>
                        <div className="mt-4">
                            <MemberDocuments member={member} locale={locale} />
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "lg:col-span-3",
                        isTimelineDescktopHidden ? "lg:hidden" : undefined
                    )}
                >
                    {/* Desktop: always show timeline */}
                    {!isTimelineDescktopHidden && <div className="hidden lg:block">
                        <MemberTimeLine member={member} />
                    </div>}

                    {/* Mobile: show timeline only when selected */}
                    <div className="lg:hidden">
                        {mobileMode === "timeline" ? <MemberTimeLine member={member} /> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
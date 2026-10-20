"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { ModalDialog } from "@workspace/ui";

import { ScanReplyNote } from "@/modules/entities/scan";
import { scannerStore } from "@/modules/shared/lib/scan";
import { ScanInputStep } from "@/modules/widgets/attendance/scanner/scan-input-step";

import { MemberScanCard } from "./MemberScanCard";
import { ProductScanCard } from "./ProductScanCard";
import { useScanner } from "./use-scanner";

/** Один сеанс сканера: камера или код вручную → ответ экрана или карточка кода. */
export function ScannerSession({ initialCode }: { initialCode?: string }) {
    const t = useTranslations("crm.scanner");
    const scanner = useScanner();
    const started = useRef(false);

    useEffect(() => {
        if (!initialCode || started.current) return;
        started.current = true;
        void scanner.read(initialCode);
    }, [initialCode, scanner]);

    const card = scanner.card;
    return (
        <ModalDialog
            open
            onOpenChange={(open) => {
                if (!open) scannerStore.close();
            }}
            size="md"
            title={card ? t(`titles.${card.kind}`) : t("title")}
            description={card ? undefined : t("description")}
        >
            {!card && (
                <div className="space-y-3">
                    {scanner.reply && <ScanReplyNote reply={scanner.reply} />}
                    <ScanInputStep
                        onRead={(code) => void scanner.read(code)}
                        reading={scanner.reading}
                        error={null}
                        cameraKey={scanner.cameraKey}
                        initialCode={initialCode}
                        manualPlaceholder={t("manualPlaceholder")}
                    />
                </div>
            )}
            {card?.kind === "member" && scanner.code && (
                <MemberScanCard member={card.member} code={scanner.code} onBack={scanner.reset} />
            )}
            {card?.kind === "product" && (
                <ProductScanCard product={card.product} onBack={scanner.reset} />
            )}
        </ModalDialog>
    );
}

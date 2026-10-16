import { SmokeToggle } from "@site/theme";

import { LEGAL_FORMATS, type LegalFormat, type LegalUi } from "./types";

const DownloadIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M12 15V3" />
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
    </svg>
);

/** Reading aids of a document page: the smoke switch and the PDF / DOCX downloads. */
export const DocTools = ({
    ui,
    href,
}: {
    ui: Pick<LegalUi, "smoke" | "download">;
    href: (format: LegalFormat) => string;
}) => (
    <div className="legal__tools">
        <SmokeToggle label={ui.smoke} className="legal__tool legal__tool--icon" />
        {LEGAL_FORMATS.map((format) => (
            <a
                key={format}
                className="legal__tool"
                href={href(format)}
                download
                aria-label={`${ui.download} ${format.toUpperCase()}`}
            >
                <DownloadIcon />
                {format.toUpperCase()}
            </a>
        ))}
    </div>
);

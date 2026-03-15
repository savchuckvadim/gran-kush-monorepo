interface AboutUsTextSectionProps {
    introTitle: string;
    introText: string;
    detailsTitle: string;
    detailsText: string;
}

export function AboutUsTextSection({
    introTitle,
    introText,
    detailsTitle,
    detailsText,
}: AboutUsTextSectionProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{introTitle}</h2>
                <p className="text-muted-foreground">{introText}</p>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{detailsTitle}</h2>
                <p className="text-muted-foreground">{detailsText}</p>
            </div>
        </div>
    );
}

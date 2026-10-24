const STACK = [
    "TypeScript",
    "Next.js",
    "React",
    "React Native",
    "NestJS",
    "PostgreSQL",
    "Prisma",
    "Redis",
    "Docker",
    "Bitrix24 REST",
    "Claude API",
    "OpenAI",
    "Telegram Bot API",
    "WhatsApp Cloud API",
    "Stripe",
    "Payload CMS",
    "Laravel",
    "Python",
    "GitHub Actions",
] as const;

/** Two copies of the list scroll as one endless line. */
export const StackMarquee = () => (
    <div className="marquee-mask overflow-hidden border-y border-border py-5" aria-hidden>
        <div className="marquee font-mono text-sm text-muted-foreground">
            {[...STACK, ...STACK].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-12">
                    {item}
                    <span className="size-1 rounded-full bg-primary/60" />
                </span>
            ))}
        </div>
    </div>
);

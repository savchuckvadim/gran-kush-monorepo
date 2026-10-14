import type { ReactNode } from "react";

export function MemberTabEmpty({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl px-4 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10 [&_svg]:size-8 [&_svg]:opacity-60">
            {icon}
            <p>{text}</p>
        </div>
    );
}

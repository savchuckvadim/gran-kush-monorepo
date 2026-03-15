import Link from "next/link";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface AuthButtonsProps {
    loginLabel: string;
    registerLabel: string;
}

export function AuthButtons({ loginLabel, registerLabel }: AuthButtonsProps) {
    const localizedLink = useLocalizedLink();

    return (
        <div className="flex items-center gap-2" role="group" aria-label="Authentication">
            <Button variant="ghost" asChild>
                <Link href={localizedLink(ROUTES.LOGIN)}>{loginLabel}</Link>
            </Button>
            <Button asChild>
                <Link href={localizedLink(ROUTES.REGISTER)}>{registerLabel}</Link>
            </Button>
        </div>
    );
}

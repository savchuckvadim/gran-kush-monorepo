import Link from "next/link";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface LogoProps {
    companyName: string;
}

export function Logo({ companyName }: LogoProps) {
    const localizedLink = useLocalizedLink();

    return (
        <Link
            href={localizedLink(ROUTES.HOME)}
            className="flex items-center space-x-2"
            aria-label={`${companyName} - Home`}
        >
            <span className="text-xl font-bold">{companyName}</span>
        </Link>
    );
}

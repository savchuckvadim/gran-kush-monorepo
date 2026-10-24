import { notFound } from "next/navigation";

// Any unknown address under a locale renders the localized not-found page instead of Next's bare one.
export default function CatchAll() {
    notFound();
}

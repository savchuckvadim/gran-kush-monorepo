"use client";

import { AboutSection } from "@/modules/widgets/about-section/about-section";
import { CTASection } from "@/modules/widgets/cta-section/cta-section";
import { HeroSection } from "@/modules/widgets/hero-section/hero-section";

export function HomePage() {
    return (
        <div className="flex flex-col overflow-hidden">
            <HeroSection />
            <AboutSection />
            <CTASection />
        </div>
    );
}

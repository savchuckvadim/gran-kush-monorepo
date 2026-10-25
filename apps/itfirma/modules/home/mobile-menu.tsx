"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { Menu, X } from "lucide-react";

import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { MENU_SECTIONS } from "@/modules/shared/config/routes";
import { SERVICE_KEYS, servicePath } from "@/modules/shared/config/services";
import { CONTACT_EMAIL } from "@/modules/shared/config/site";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { ICON_BUTTON } from "@/modules/shared/ui/icon-button";
import { useDismiss } from "@/modules/shared/ui/use-dismiss";

/**
 * The burger of the bottom bar: a glass sheet above the bar with the sections, the eight services
 * and the request button. It closes on a link, on Escape and on a press outside.
 */
export const MobileMenu = () => {
    const t = useTranslations("nav");
    const cta = useTranslations("cta");
    const services = useTranslations("services.items");
    const pathname = usePathname();
    // open only on the page it was opened on: a navigation (link, back button) closes it
    const [openedAt, setOpenedAt] = useState<string | null>(null);
    const open = openedAt === pathname;
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const close = useCallback(() => setOpenedAt(null), []);

    const refs = useMemo(() => [rootRef, panelRef], []);
    useDismiss(open, close, refs);

    return (
        <div ref={rootRef} className="shrink-0">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? t("closeMenu") : t("menu")}
                title={open ? t("closeMenu") : t("menu")}
                onClick={() => setOpenedAt(open ? null : pathname)}
                className={ICON_BUTTON}
            >
                {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            {/* in a portal: the bar blurs its backdrop, which would pin a fixed sheet to the bar box */}
            {open
                ? createPortal(
                      <div
                          ref={panelRef}
                          id={panelId}
                          className="mobile-sheet glass fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-h-[calc(100dvh-9rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl [scrollbar-width:thin]"
                      >
                          <nav aria-label={t("menu")} className="flex flex-col gap-8 p-6">
                              <ul className="space-y-1">
                                  {MENU_SECTIONS.map((section) => (
                                      <li key={section}>
                                          <Link
                                              href={`/#${section}`}
                                              onClick={close}
                                              className="block py-1.5 font-display text-2xl tracking-tight"
                                          >
                                              {t(section)}
                                          </Link>
                                      </li>
                                  ))}
                                  <li>
                                      <Link
                                          href={INSIGHTS_PATH}
                                          onClick={close}
                                          className="block py-1.5 font-display text-2xl tracking-tight"
                                      >
                                          {t("insights")}
                                      </Link>
                                  </li>
                                  <li>
                                      <Link
                                          href="/#faq"
                                          onClick={close}
                                          className="block py-1.5 font-display text-2xl tracking-tight"
                                      >
                                          {t("faq")}
                                      </Link>
                                  </li>
                              </ul>
                              <div>
                                  <p className="mb-3 text-sm text-muted-foreground">
                                      {t("services")}
                                  </p>
                                  <ul className="grid gap-y-2">
                                      {SERVICE_KEYS.map((key) => (
                                          <li key={key}>
                                              <Link
                                                  href={servicePath(key)}
                                                  onClick={close}
                                                  className="text-foreground underline-offset-4 hover:underline"
                                              >
                                                  {services(`${key}.title`)}
                                              </Link>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div className="flex flex-col items-start gap-4 border-t border-border pt-6">
                                  <CtaLink onClick={close}>{cta("request")}</CtaLink>
                                  <a
                                      href={`mailto:${CONTACT_EMAIL}`}
                                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                                  >
                                      {CONTACT_EMAIL}
                                  </a>
                              </div>
                          </nav>
                      </div>,
                      document.body
                  )
                : null}
        </div>
    );
};

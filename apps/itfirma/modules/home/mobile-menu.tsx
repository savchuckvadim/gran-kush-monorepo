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
 * The burger of phones and tablets: a panel under the header with the sections, the eight
 * services and the request button. It closes on a link, on Escape and on a press outside.
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
        <div ref={rootRef} className="lg:hidden">
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
            {/* in a portal: the header blurs its backdrop, which would pin a fixed panel to the header box */}
            {open
                ? createPortal(
                      <div
                          ref={panelRef}
                          id={panelId}
                          className="mobile-panel fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-background"
                      >
                          <nav aria-label={t("menu")} className="wrap flex flex-col gap-10 py-8">
                              <ul className="space-y-1">
                                  {MENU_SECTIONS.map((section) => (
                                      <li key={section}>
                                          <Link
                                              href={`/#${section}`}
                                              onClick={close}
                                              className="block py-2 font-display text-3xl tracking-tight"
                                          >
                                              {t(section)}
                                          </Link>
                                      </li>
                                  ))}
                                  <li>
                                      <Link
                                          href={INSIGHTS_PATH}
                                          onClick={close}
                                          className="block py-2 font-display text-3xl tracking-tight"
                                      >
                                          {t("insights")}
                                      </Link>
                                  </li>
                                  <li>
                                      <Link
                                          href="/#faq"
                                          onClick={close}
                                          className="block py-2 font-display text-3xl tracking-tight"
                                      >
                                          {t("faq")}
                                      </Link>
                                  </li>
                              </ul>
                              <div>
                                  <p className="mb-3 text-sm text-muted-foreground">
                                      {t("services")}
                                  </p>
                                  <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
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
                              <div className="flex flex-col items-start gap-4 border-t border-border pt-8">
                                  <CtaLink size="lg" onClick={close}>
                                      {cta("request")}
                                  </CtaLink>
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

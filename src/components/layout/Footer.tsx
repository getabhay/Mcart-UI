// src/components/layout/Footer.tsx
import Link from "next/link";
import { getCategoryTree, type CategoryNode } from "@/lib/categories";

type FooterLink = { label: string; href: string };

function makeSearchHref(slugOrFallback: string): string {
  return `/search?q=${encodeURIComponent(slugOrFallback)}`;
}

type OnlineKey =
  | "men"
  | "women"
  | "boy"
  | "girl"
  | "baby"
  | "home_kitchen"
  | "beauty"
  | "books"
  | "toys"
  | "electronics"
  | "health";

type OnlineEntry = {
  key: OnlineKey;
  label: string;
  matches: string[]; // slugs or names
};

const ONLINE_SHOPPING_MAP: OnlineEntry[] = [
  { key: "men", label: "Men", matches: ["men", "mens"] },
  { key: "women", label: "Women", matches: ["women", "womens"] },
  { key: "boy", label: "Boy", matches: ["boy", "boys"] },
  { key: "girl", label: "Girl", matches: ["girl", "girls"] },
  { key: "baby", label: "Baby", matches: ["baby", "bay"] },
  { key: "home_kitchen", label: "Home & Kitchen", matches: ["home-kitchen", "home kitchen", "home", "kitchen"] },
  { key: "beauty", label: "Beauty & Personal Care", matches: ["beauty-personal-care", "beauty personal care", "beauty"] },
  { key: "books", label: "Books", matches: ["books", "book"] },
  { key: "toys", label: "Toys & Games", matches: ["toys-games", "toys & games", "toys", "games"] },
  { key: "electronics", label: "Electronics", matches: ["electronics", "electronic"] },
  { key: "health", label: "Health & Wellness", matches: ["health", "wellness", "health-wellness", "health & wellness"] },
];

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function findCategoryInTree(roots: CategoryNode[], candidates: string[]): CategoryNode | null {
  const keys = candidates.map(norm).filter(Boolean);

  const all: CategoryNode[] = [];
  const walk = (n: CategoryNode) => {
    all.push(n);
    for (const ch of n.children ?? []) walk(ch);
  };
  for (const r of roots) walk(r);

  for (const k of keys) {
    const hit = all.find((c) => norm(c.slug) === k);
    if (hit) return hit;
  }
  for (const k of keys) {
    const hit = all.find((c) => norm(c.name) === k);
    if (hit) return hit;
  }
  for (const k of keys) {
    const hit = all.find((c) => norm(c.slug).includes(k) || norm(c.name).includes(k));
    if (hit) return hit;
  }

  return null;
}

function buildOnlineShoppingLinks(roots: CategoryNode[]): Array<FooterLink & { iconKey: OnlineKey }> {
  return ONLINE_SHOPPING_MAP.map((entry) => {
    const found = findCategoryInTree(roots, entry.matches);
    const slugOrFallback = found?.slug && found.slug.trim().length > 0 ? found.slug : entry.matches[0];

    return {
      label: entry.label,
      href: makeSearchHref(slugOrFallback),
      iconKey: entry.key,
    };
  });
}

/* =========================
   SVG ICONS (tiny + Myntra-like)
   ========================= */

function SvgIcon({ k }: { k: OnlineKey }) {
  const cls = "h-4 w-4 text-gray-700 dark:text-gray-200";
  const stroke = "currentColor";

  // minimal stroke icons (no fill) => clean in light/dark
  switch (k) {
    case "men":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3h7v7" />
          <path d="M21 3l-8 8" />
          <circle cx="10" cy="14" r="5" />
        </svg>
      );
    case "women":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="5" />
          <path d="M12 13v8" />
          <path d="M8.5 18H15.5" />
        </svg>
      );
    case "boy":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 7c2-2 8-2 10 0" />
          <circle cx="12" cy="10" r="3" />
          <path d="M6 21a6 6 0 0 1 12 0" />
        </svg>
      );
    case "girl":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 8c1-2 3-3 5-3s4 1 5 3" />
          <circle cx="12" cy="10" r="3" />
          <path d="M8 14l-2 3" />
          <path d="M16 14l2 3" />
          <path d="M6 21a6 6 0 0 1 12 0" />
        </svg>
      );
    case "baby":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <path d="M10 10h.01" />
          <path d="M14 10h.01" />
          <path d="M9.5 14c1.5 1.5 3.5 1.5 5 0" />
          <path d="M12 5c0-1.5 1.5-2 3-1" />
        </svg>
      );
    case "home_kitchen":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "beauty":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 7l10 10" />
          <path d="M12 4l2 2-8 8-2-2 8-8z" />
          <path d="M14 6l4 4" />
          <path d="M8 20h8" />
        </svg>
      );
    case "books":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19a2 2 0 0 0 2 2h14" />
          <path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
        </svg>
      );
    case "toys":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case "electronics":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="6" width="16" height="10" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
        </svg>
      );
    case "health":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-16 0" />
          <path d="M12 4v8" />
          <path d="M8 8h8" />
          <path d="M7 14h3l2-3 2 6 2-3h3" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-extrabold tracking-[0.10em] text-gray-900 dark:text-gray-100">
      {children}
    </div>
  );
}

function PremiumLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="footer-link">
      {children}
    </Link>
  );
}

export default async function Footer() {
  let roots: CategoryNode[] = [];
  try {
    roots = await getCategoryTree();
  } catch {
    roots = [];
  }

  const online = buildOnlineShoppingLinks(roots);

  const useful: FooterLink[] = [
    { label: "Contact Us", href: "#" },
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "Terms of Use", href: "#" },
  ];

  const policies: FooterLink[] = [
    { label: "Return Policy", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Shipping Policy", href: "#" },
    { label: "Cancellation Policy", href: "#" },
  ];

  return (
    <footer className="mt-14 border-t border-gray-200 bg-[#F5F5F6] dark:border-white/10 dark:bg-[#0B0F14]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* COL 1: ONLINE SHOPPING */}
          <section className="footer-col">
            <SectionTitle>ONLINE SHOPPING</SectionTitle>

            <ul className="mt-5 space-y-2.5">
              {online.map((l) => (
                <li key={l.label} className="flex items-center gap-2.5">
                  {/* <span className="iconBadge" aria-hidden="true">
                    <SvgIcon k={l.iconKey} />
                  </span> */}
                  <PremiumLink href={l.href}>{l.label}</PremiumLink>
                </li>
              ))}
            </ul>
          </section>

          {/* COL 2: USEFUL + POLICIES */}
          <section className="footer-col md:pl-8 md:footer-divider">
            <div>
              <SectionTitle>USEFUL LINKS</SectionTitle>
              <ul className="mt-5 space-y-2.5">
                {useful.map((l) => (
                  <li key={l.label}>
                    <PremiumLink href={l.href}>{l.label}</PremiumLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <SectionTitle>CUSTOMER POLICIES</SectionTitle>
              <ul className="mt-5 space-y-2.5">
                {policies.map((l) => (
                  <li key={l.label}>
                    <PremiumLink href={l.href}>{l.label}</PremiumLink>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* COL 3: MAIL US + APP + SOCIAL */}
          <section className="footer-col md:pl-8 md:footer-divider">
            <SectionTitle>MAIL US</SectionTitle>

            <div className="mt-5 text-[13px] leading-6 text-gray-700 dark:text-gray-300">
              <div className="font-semibold text-gray-900 dark:text-gray-100">MCart Private Limited,</div>
              <div>Rajaji Puram,</div>
              <div>Lucknow, 226017,</div>
              <div>Uttar Pradesh, India</div>
            </div>

            <div className="mt-8">
              <SectionTitle>EXPERIENCE MCART APP ON MOBILE</SectionTitle>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="badge">
                  <span className="badgeDot" aria-hidden="true" />
                  Google Play <span className="badgeSub">(soon)</span>
                </div>
                <div className="badge">
                  <span className="badgeDot" aria-hidden="true" />
                  App Store <span className="badgeSub">(soon)</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <SectionTitle>KEEP IN TOUCH</SectionTitle>
              <div className="mt-4 flex gap-3">
                {[
                  { label: "Facebook", glyph: "f" },
                  { label: "Instagram", glyph: "in" },
                  { label: "Twitter", glyph: "x" },
                  { label: "YouTube", glyph: "▶" },
                ].map((s) => (
                  <a key={s.label} href="#" aria-label={s.label} className="socialBtn">
                    {s.glyph}
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* COL 4: GUARANTEES */}
          <section className="footer-col md:pl-8 md:footer-divider">
            <div className="space-y-4">
              <div className="perkCard">
                <div className="perkIcon" aria-hidden="true">
                  ✓
                </div>
                <div className="perkText">
                  <div className="perkTitle">100% ORIGINAL</div>
                  <div className="perkDesc">Guarantee for all products at mcart.com</div>
                </div>
              </div>

              <div className="perkCard">
                <div className="perkIcon" aria-hidden="true">
                  ↩
                </div>
                <div className="perkText">
                  <div className="perkTitle">14 DAYS RETURN</div>
                  <div className="perkDesc">Return within 14 days of receiving your order</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-[12px] text-gray-600 dark:border-white/10 dark:text-gray-400">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} MCART. All rights reserved.</div>
            <div className="flex flex-wrap gap-4">
              <Link href="#" className="footer-mini-link">
                Privacy
              </Link>
              <Link href="#" className="footer-mini-link">
                Terms
              </Link>
              <Link href="#" className="footer-mini-link">
                Sitemap
              </Link>
            </div>
          </div>
        </div>

        {/* Ultra premium micro-interactions + divider gradient */}
        <style>{`
          @keyframes footerFadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .footer-col {
            animation: footerFadeUp 520ms cubic-bezier(.2,.9,.2,1) both;
          }
          .footer-col:nth-child(2) { animation-delay: 80ms; }
          .footer-col:nth-child(3) { animation-delay: 160ms; }
          .footer-col:nth-child(4) { animation-delay: 240ms; }

          /* divider gradient (desktop) */
          .footer-divider {
            position: relative;
          }
          .footer-divider::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 1px;
            background: linear-gradient(to bottom, transparent, rgba(17,24,39,0.14), transparent);
            opacity: 0.95;
          }
          :global(.dark) .footer-divider::before {
            background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.16), transparent);
          }

          /* icon badge */
          .iconBadge {
            display: inline-flex;
            height: 28px;
            width: 28px;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 1px solid rgba(17,24,39,0.10);
            background: rgba(255,255,255,0.85);
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
          }
          .iconBadge:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(0,0,0,0.08);
            background: #ffffff;
          }
          :global(.dark) .iconBadge {
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.06);
          }
          :global(.dark) .iconBadge:hover {
            background: rgba(255,255,255,0.10);
            box-shadow: 0 14px 28px rgba(0,0,0,0.45);
          }

          /* premium link underline + lift */
          .footer-link {
            position: relative;
            display: inline-block;
            font-size: 13px;
            color: #374151;
            transition: color 180ms ease, transform 200ms ease;
          }
          :global(.dark) .footer-link { color: rgba(255,255,255,0.78); }

          .footer-link::after {
            content: "";
            position: absolute;
            left: 0;
            bottom: -3px;
            height: 1px;
            width: 100%;
            background: #111827;
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 240ms ease;
            opacity: 0.9;
          }
          :global(.dark) .footer-link::after { background: rgba(255,255,255,0.9); }

          .footer-link:hover {
            color: #111827;
            transform: translateY(-1px);
          }
          :global(.dark) .footer-link:hover { color: #ffffff; }

          .footer-link:hover::after {
            transform: scaleX(1);
          }

          .footer-mini-link {
            color: #4B5563;
            transition: color 180ms ease;
          }
          :global(.dark) .footer-mini-link { color: rgba(255,255,255,0.65); }

          .footer-mini-link:hover {
            color: #111827;
            text-decoration: underline;
            text-underline-offset: 4px;
          }
          :global(.dark) .footer-mini-link:hover { color: #ffffff; }

          /* App badges */
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 12px;
            border: 1px solid rgba(17,24,39,0.12);
            background: rgba(255,255,255,0.9);
            padding: 10px 12px;
            font-size: 12px;
            color: #111827;
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
          }
          .badge:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(0,0,0,0.08);
            background: #ffffff;
          }
          :global(.dark) .badge {
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.88);
          }
          :global(.dark) .badge:hover {
            background: rgba(255,255,255,0.10);
            box-shadow: 0 14px 28px rgba(0,0,0,0.45);
          }

          .badgeDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #111827;
          }
          :global(.dark) .badgeDot { background: rgba(255,255,255,0.9); }

          .badgeSub {
            color: rgba(17,24,39,0.55);
          }
          :global(.dark) .badgeSub { color: rgba(255,255,255,0.55); }

          /* Social buttons */
          .socialBtn {
            display: inline-flex;
            height: 38px;
            width: 44px;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            border: 1px solid rgba(17,24,39,0.10);
            background: rgba(255,255,255,0.85);
            font-size: 12px;
            color: rgba(17,24,39,0.85);
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
          }
          .socialBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(0,0,0,0.08);
            background: #ffffff;
            color: #111827;
          }
          :global(.dark) .socialBtn {
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.80);
          }
          :global(.dark) .socialBtn:hover {
            background: rgba(255,255,255,0.10);
            box-shadow: 0 16px 32px rgba(0,0,0,0.45);
            color: #ffffff;
          }

          /* Perks */
          .perkCard {
            display: flex;
            gap: 12px;
            border-radius: 14px;
            border: 1px solid rgba(17,24,39,0.10);
            background: rgba(255,255,255,0.85);
            padding: 14px;
            transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
          }
          .perkCard:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(0,0,0,0.08);
            background: #ffffff;
          }
          :global(.dark) .perkCard {
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.06);
          }
          :global(.dark) .perkCard:hover {
            background: rgba(255,255,255,0.10);
            box-shadow: 0 16px 32px rgba(0,0,0,0.45);
          }

          .perkIcon {
            display: flex;
            height: 34px;
            width: 34px;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(17,24,39,0.06);
            color: #111827;
            font-weight: 800;
          }
          :global(.dark) .perkIcon {
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.92);
          }

          .perkTitle {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #111827;
          }
          :global(.dark) .perkTitle { color: rgba(255,255,255,0.92); }

          .perkDesc {
            margin-top: 2px;
            font-size: 12px;
            color: rgba(17,24,39,0.70);
          }
          :global(.dark) .perkDesc { color: rgba(255,255,255,0.65); }
        `}</style>
      </div>
    </footer>
  );
}

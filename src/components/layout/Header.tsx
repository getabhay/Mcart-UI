// src/components/layout/Header.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

/* -------------------- Types -------------------- */

type CategoryFlat = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isLeaf: boolean;
};

type CategoryNode = CategoryFlat & { children: CategoryNode[] };

type ThemeMode = "light" | "dark";

type ColumnsModel = {
  cols: CategoryNode[][];
  headers: string[];
  selectedNodes: CategoryNode[];
};

type AuthState =
  | { isLoggedIn: false }
  | { isLoggedIn: true; email: string; displayName: string };

type SuggestResponse = {
  q?: string;
  correctedQuery?: string | null;
  didYouMean?: string[];
  usedQuery?: string | null;
  products?: Array<{
    text: string;
    type?: "PRODUCT";
    slug: string;
    id?: number | null;
    path?: string | null;
  }>;
};

/* -------------------- Config -------------------- */

const NAV_VISIBLE_ROOTS = 7;
const MAX_SEARCH_DROPDOWN_ROWS = 5;

/* -------------------- Utils -------------------- */

function useDebounced<T>(value: T, delayMs: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function makeSearchHrefBySlug(slug: string): string {
  return `/search?q=${encodeURIComponent(slug)}`;
}

function buildTreeOrderById(list: CategoryFlat[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const c of list) byId.set(c.id, { ...c, children: [] });

  for (const c of list) {
    const node = byId.get(c.id);
    if (!node) continue;

    if (c.parentId == null) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(c.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.id - b.id);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

function firstChild(n: CategoryNode | null): CategoryNode | null {
  if (!n) return null;
  return n.children.length > 0 ? n.children[0] : null;
}

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emphasizeTypedPart(text: string, typed: string): React.ReactNode {
  const q = typed.trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegex(q)})`, "ig");
  const parts = text.split(re);
  if (parts.length === 1) return text;
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <span key={`${part}-${idx}`} className="font-bold italic">
        {part}
      </span>
    ) : (
      <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
    )
  );
}

/* -------------------- Theme -------------------- */

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("mcart_theme");
  if (saved === "dark" || saved === "light") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.localStorage.setItem("mcart_theme", mode);
}

/* -------------------- Animated Placeholder -------------------- */

function useTypedPlaceholder(phrases: string[], speedMs = 26, holdMs = 1150): string {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [dir, setDir] = useState<"forward" | "pause" | "back">("forward");

  useEffect(() => {
    if (phrases.length === 0) return;

    const phrase = phrases[idx] ?? "";
    let t: number | null = null;

    if (dir === "forward") {
      t = window.setTimeout(() => {
        const nextLen = Math.min(len + 1, phrase.length);
        setLen(nextLen);
        if (nextLen >= phrase.length) setDir("pause");
      }, speedMs);
    } else if (dir === "pause") {
      t = window.setTimeout(() => setDir("back"), holdMs);
    } else {
      t = window.setTimeout(() => {
        const nextLen = Math.max(len - 1, 0);
        setLen(nextLen);
        if (nextLen === 0) {
          setIdx((v) => (v + 1) % phrases.length);
          setDir("forward");
        }
      }, Math.max(20, Math.floor(speedMs * 0.75)));
    }

    return () => {
      if (t != null) window.clearTimeout(t);
    };
  }, [phrases, idx, len, dir, speedMs, holdMs]);

  const cur = phrases[idx] ?? "";
  return cur.slice(0, len);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/* -------------------- Auth (UI-only) -------------------- */

const AUTH_KEY = "mcart_auth_v1";
const CART_COUNT_KEY = "mcart_cart_count_v1";
const DUMMY_EMAIL = "user@mcart.com";
const DUMMY_PASS = "test@123";

function readAuth(): AuthState {
  if (typeof window === "undefined") return { isLoggedIn: false };
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return { isLoggedIn: false };

  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    if (parsed && typeof parsed === "object" && "isLoggedIn" in parsed && parsed.isLoggedIn === true) {
      const email =
        typeof (parsed as { email?: unknown }).email === "string"
          ? (parsed as { email: string }).email
          : DUMMY_EMAIL;
      const displayName =
        typeof (parsed as { displayName?: unknown }).displayName === "string"
          ? (parsed as { displayName: string }).displayName
          : "User";
      return { isLoggedIn: true, email, displayName };
    }
  } catch {
    // ignore
  }
  return { isLoggedIn: false };
}

function writeAuth(a: AuthState) {
  if (typeof window === "undefined") return;
  if (!a.isLoggedIn) {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}

function readCartCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(CART_COUNT_KEY);
  const n = Number(raw ?? "0");
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/* -------------------- Icons (SVG) -------------------- */

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-4.35-9.5-8.5C.7 9.1 2.4 5.8 5.9 5.2c1.9-.3 3.6.6 4.6 1.9 1-1.3 2.7-2.2 4.6-1.9 3.5.6 5.2 3.9 3.4 7.3C19 16.65 12 21 12 21z" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 7h12l-1 14H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconDot() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 12h.01" />
      <path d="M12 12h.01" />
      <path d="M18 12h.01" />
    </svg>
  );
}

function IconCaretDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12.5A8.5 8.5 0 0 1 11.5 3a6.5 6.5 0 1 0 9.5 9.5z" />
    </svg>
  );
}

/* -------------------- UI Bits -------------------- */

function Breadcrumb({
  items,
  onClose,
}: {
  items: Array<{ label: string; href: string }>;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      {items.map((it, idx) => (
        <React.Fragment key={it.href}>
          <Link
            href={it.href}
            onClick={onClose}
            className="font-semibold text-gray-900 hover:underline underline-offset-4 dark:text-gray-100"
          >
            {it.label}
          </Link>
          {idx < items.length - 1 ? <span className="text-gray-400 dark:text-gray-600">/</span> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function ActionLink({
  icon,
  label,
  href,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-white/5"
      aria-label={label}
    >
      <span className="relative flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-800 transition hover:text-black dark:text-gray-100 dark:hover:text-white">
        <span className="relative">
          {icon}
          {typeof badge === "number" && badge > 0 ? (
            <span className="absolute -right-2 -top-2 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-black">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="leading-none">{label}</span>
      </span>
    </Link>
  );
}

/* shared nav underline animation */
function NavLink({
  label,
  href,
  active,
  onHover,
  rightIcon,
}: {
  label: string;
  href: string;
  active: boolean;
  onHover?: () => void;
  rightIcon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHover}
      className={`group relative inline-flex items-center gap-2 text-sm font-extrabold tracking-wide transition-colors ${
        active ? "text-gray-900 dark:text-white" : "text-gray-700 hover:text-black dark:text-gray-200"
      }`}
    >
      <span className="relative">
        {label}
        <span
          className={`absolute -bottom-2 left-0 h-[2px] w-full origin-left scale-x-0 bg-black transition-transform duration-200 ease-out dark:bg-white ${
            active ? "scale-x-100" : "group-hover:scale-x-100"
          }`}
        />
      </span>
      {rightIcon ? (
        <span className="text-gray-500 transition-transform duration-200 group-hover:translate-y-[1px] dark:text-gray-400">
          {rightIcon}
        </span>
      ) : null}
    </Link>
  );
}

/* -------------------- Header -------------------- */

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const hideCategoryNav = pathname.startsWith("/p/");
  const [cartCount, setCartCount] = useState(0);

  /* theme */
  const [theme, setTheme] = useState<ThemeMode>("light");
  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);
  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  /* auth */
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false });
  useEffect(() => setAuth(readAuth()), []);

  /* cart badge */
  useEffect(() => {
    setCartCount(readCartCount());
    function syncFromStorage() {
      setCartCount(readCartCount());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === CART_COUNT_KEY) syncFromStorage();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("mcart:cart-count", syncFromStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mcart:cart-count", syncFromStorage as EventListener);
    };
  }, []);

  /* account popup */
  const [acctHover, setAcctHover] = useState(false);
  const acctCloseTimer = useRef<number | null>(null);

  function acctOpenNow() {
    if (acctCloseTimer.current != null) window.clearTimeout(acctCloseTimer.current);
    acctCloseTimer.current = null;
    setAcctHover(true);
  }

  function acctCloseSoon() {
    if (acctCloseTimer.current != null) window.clearTimeout(acctCloseTimer.current);
    acctCloseTimer.current = window.setTimeout(() => setAcctHover(false), 160);
  }

  /* login (UI-only) */
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupAccepted, setSignupAccepted] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [signupErr, setSignupErr] = useState<string | null>(null);
  const [signupOk, setSignupOk] = useState<string | null>(null);
  const loginReady = isValidEmail(email) && pass.trim().length > 0;
  const signupReady =
    signupName.trim().length > 0 &&
    isValidEmail(signupEmail) &&
    signupPass.trim().length > 0 &&
    signupAccepted;

  function doLogin() {
    const e = email.trim();
    const pw = pass.trim();
    if (e === DUMMY_EMAIL && pw === DUMMY_PASS) {
      const next: AuthState = { isLoggedIn: true, email: e, displayName: "MCART User" };
      writeAuth(next);
      setAuth(next);
      setLoginErr(null);
      setAcctHover(false);
      setEmail("");
      setPass("");
      return;
    }
    setLoginErr("Invalid credentials. Try user@mcart.com / test@123");
  }

  function doSignup() {
    setSignupErr(null);
    setSignupOk(null);
    if (!signupName.trim()) {
      setSignupErr("Please enter name.");
      return;
    }
    if (!signupEmail.trim()) {
      setSignupErr("Please enter email.");
      return;
    }
    if (!signupPass.trim()) {
      setSignupErr("Please enter password.");
      return;
    }
    if (!signupAccepted) {
      setSignupErr("Please accept the checkbox to continue.");
      return;
    }
    setSignupOk("Sign up submitted successfully. Please login.");
    setEmail(signupEmail.trim());
    setPass("");
    setAuthView("login");
  }

  function doLogout() {
    writeAuth({ isLoggedIn: false });
    setAuth({ isLoggedIn: false });
    setAcctHover(false);
  }

  /* search (PRODUCT-NAMES ONLY via /api/suggest) */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState<string>("");
  const debouncedQ = useDebounced(q.trim(), 220);

  const placeholder = useTypedPlaceholder(
    [
      "Search for products, brands and more",
      "Try: shoes, kurtas, mobiles, skincare…",
      "Discover: puma, polo, allen solly, hrx…",
    ],
    26,
    1150
  );

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [productNames, setProductNames] = useState<Array<{ text: string; slug: string }>>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);

  // active index for a combined list:
  // 0 => correctedQuery row (if exists)
  // then products list
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const canSuggest = useMemo(() => debouncedQ.length >= 2, [debouncedQ]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!canSuggest) {
        setSuggest(null);
        setProductNames([]);
        setCorrectedQuery(null);
        setActiveIdx(-1);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ q: debouncedQ });
        const res = await fetch(`/api/suggest?${params.toString()}`, { method: "GET" });
        const json = (await res.json().catch(() => ({}))) as unknown;

        if (cancelled) return;

        const data = (json && typeof json === "object" ? (json as SuggestResponse) : {}) as SuggestResponse;
        setSuggest(data);

        const corr = typeof data.correctedQuery === "string" && data.correctedQuery.trim().length > 0
          ? data.correctedQuery.trim()
          : null;

        // Only treat it as autocorrect if it differs from the typed query
        const corrUseful = corr && corr.toLowerCase() !== debouncedQ.toLowerCase() ? corr : null;
        setCorrectedQuery(corrUseful);

        const prods = Array.isArray(data.products) ? data.products : [];
        const names = prods
          .map((p) => ({
            text: normalizeText(p.text).trim(),
            slug: normalizeText(p.slug).trim(),
          }))
          .filter((p) => p.text.length > 0 && p.slug.length > 0);

        setProductNames(names);
        setActiveIdx(-1);
      } catch {
        if (!cancelled) {
          setSuggest(null);
          setProductNames([]);
          setCorrectedQuery(null);
          setActiveIdx(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, canSuggest]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (t as HTMLInputElement | null)?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function goToProduct(slug: string) {
    setOpen(false);
    setSuggest(null);
    setProductNames([]);
    setCorrectedQuery(null);
    setActiveIdx(-1);
    router.push(`/p/${encodeURIComponent(slug)}`);
  }

  function goToSearch(query: string) {
    const val = query.trim();
    setOpen(false);
    setSuggest(null);
    setProductNames([]);
    setCorrectedQuery(null);
    setActiveIdx(-1);
    router.push(val ? `/search?q=${encodeURIComponent(val)}` : "/search");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const hasCorr = typeof correctedQuery === "string" && correctedQuery.trim().length > 0;
    const corrRow = hasCorr ? 1 : 0;

    // If user highlighted a dropdown row, Enter selects it
    if (open && activeIdx >= 0) {
      // corrected row is index 0 when present
      if (hasCorr && activeIdx === 0) {
        goToSearch(correctedQuery!);
        return;
      }
      const prodIdx = activeIdx - corrRow;
      if (prodIdx >= 0 && prodIdx < visibleProductNames.length) {
        goToProduct(visibleProductNames[prodIdx].slug);
        return;
      }
    }

    // Otherwise: autocorrect if backend provides correctedQuery (and it differs)
    const typed = q.trim();
    if (hasCorr && typed.length >= 2) {
      goToSearch(correctedQuery!);
      return;
    }

    goToSearch(typed);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    const hasCorr = typeof correctedQuery === "string" && correctedQuery.trim().length > 0;
    const totalRows = (hasCorr ? 1 : 0) + visibleProductNames.length;

    if (e.key === "ArrowDown") {
      if (totalRows === 0) return;
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalRows - 1));
    } else if (e.key === "ArrowUp") {
      if (totalRows === 0) return;
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  const visibleProductNames = useMemo(() => {
    const hasCorr = typeof correctedQuery === "string" && correctedQuery.trim().length > 0;
    const maxProducts = hasCorr ? Math.max(0, MAX_SEARCH_DROPDOWN_ROWS - 1) : MAX_SEARCH_DROPDOWN_ROWS;
    return productNames.slice(0, maxProducts);
  }, [correctedQuery, productNames]);
  const showDropdown = open && !loading && (correctedQuery || visibleProductNames.length > 0);

  /* categories */
  const [catRoots, setCatRoots] = useState<CategoryNode[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    if (hideCategoryNav && navOpen) setNavOpen(false);
  }, [hideCategoryNav, navOpen]);

  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const [pathIds, setPathIds] = useState<number[]>([]);

  const [moreOpen, setMoreOpen] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  function clearCloseTimer() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }
  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveRootId(null);
      setPathIds([]);
    }, 140);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCats() {
      try {
        const res = await fetch("/api/categories/tree", { method: "GET" });
        const json = (await res.json().catch(() => [])) as unknown;
        if (!res.ok) return;

        const arr: CategoryFlat[] = Array.isArray(json) ? (json as CategoryFlat[]) : [];

        const normalized: CategoryFlat[] = arr
          .filter((x) => x && typeof x.id === "number")
          .map((c) => ({
            id: c.id,
            name: String(c.name ?? ""),
            slug: String(c.slug ?? ""),
            parentId: (c.parentId ?? null) as number | null,
            isLeaf: Boolean(c.isLeaf),
          }))
          .filter((x) => x.name && x.slug);

        if (!cancelled) setCatRoots(buildTreeOrderById(normalized));
      } catch {
        // ignore
      }
    }

    loadCats();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRoots = useMemo(() => catRoots.slice(0, NAV_VISIBLE_ROOTS), [catRoots]);
  const overflowRoots = useMemo(() => catRoots.slice(NAV_VISIBLE_ROOTS), [catRoots]);

  const activeRoot = useMemo(
    () => catRoots.find((r) => r.id === activeRootId) ?? null,
    [catRoots, activeRootId]
  );

  useEffect(() => {
    if (!activeRoot) return;

    const seed: number[] = [];
    let cur: CategoryNode | null = firstChild(activeRoot);

    while (cur && seed.length < 6) {
      seed.push(cur.id);
      cur = firstChild(cur);
    }

    setPathIds(seed);
  }, [activeRootId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnsModel = useMemo((): ColumnsModel => {
    if (!activeRoot) return { cols: [], headers: [], selectedNodes: [] };

    const cols: CategoryNode[][] = [];
    const headers: string[] = [];
    const selectedNodes: CategoryNode[] = [];

    cols.push(activeRoot.children);
    headers.push(activeRoot.name);

    const findChild = (parent: CategoryNode, id: number): CategoryNode | null =>
      parent.children.find((c) => c.id === id) ?? null;

    let current: CategoryNode | null = null;

    if (pathIds.length > 0) {
      current = activeRoot.children.find((c) => c.id === pathIds[0]) ?? null;
      if (current) selectedNodes.push(current);

      if (current && current.children.length > 0) {
        cols.push(current.children);
        headers.push(current.name);
      }

      for (let i = 1; i < pathIds.length; i++) {
        if (!current) break;

        const next = findChild(current, pathIds[i]);
        current = next;
        if (current) selectedNodes.push(current);

        if (current && current.children.length > 0) {
          cols.push(current.children);
          headers.push(current.name);
        } else {
          break;
        }
      }
    }

    return {
      cols: cols.slice(0, 6),
      headers: headers.slice(0, 6),
      selectedNodes,
    };
  }, [activeRoot, pathIds]);

  const breadcrumbItems = useMemo(() => {
    if (!activeRoot) return [];
    const items: Array<{ label: string; href: string }> = [
      { label: activeRoot.name, href: makeSearchHrefBySlug(activeRoot.slug) },
    ];
    for (const n of columns.selectedNodes) items.push({ label: n.name, href: makeSearchHrefBySlug(n.slug) });
    return items;
  }, [activeRoot, columns.selectedNodes]);

  function openRoot(id: number) {
    clearCloseTimer();
    setActiveRootId(id);
  }

  function onHoverNode(depth: number, nodeId: number) {
    if (!activeRoot) return;

    const nextPath: number[] = pathIds.slice(0, depth);
    nextPath[depth] = nodeId;

    const resolveNodeAtDepth = (): CategoryNode | null => {
      let node = activeRoot.children.find((c) => c.id === nextPath[0]) ?? null;
      if (!node) return null;
      for (let i = 1; i <= depth; i++) {
        node = node.children.find((c) => c.id === nextPath[i]) ?? null;
        if (!node) return null;
      }
      return node;
    };

    let cur = resolveNodeAtDepth();
    while (cur && cur.children.length > 0 && nextPath.length < 6) {
      const ch = cur.children[0];
      nextPath.push(ch.id);
      cur = ch;
    }

    setPathIds(nextPath);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F14]">
      {/* subtle premium gradient hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />

      {/* Top row */}
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-1.5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:px-3">
        <button
          type="button"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 md:hidden"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <Link href="/" className="flex items-center justify-start">
          <Image
            src="/logo/logo.png"
            alt="MCART"
            width={220}
            height={64}
            priority
            className="h-[42px] w-auto sm:h-[50px] md:h-[56px]"
          />
        </Link>

        <div ref={boxRef} className="relative w-full">
          <form onSubmit={onSubmit} className="relative w-full md:w-[90%]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <IconSearch />
            </span>

            {/* ✅ Search glow on focus */}
            <div className="rounded-full transition focus-within:ring-4 focus-within:ring-black/10 dark:focus-within:ring-white/10">
              <input
                ref={inputRef}
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-10 text-[14px] shadow-sm outline-none transition
                           focus:border-gray-300 focus:bg-white focus:shadow-md
                           dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-white/5"
                placeholder={placeholder || "Search for products, brands and more"}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
              />
            </div>

            {q.trim().length > 0 ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => {
                  setQ("");
                  setSuggest(null);
                  setProductNames([]);
                  setCorrectedQuery(null);
                  setActiveIdx(-1);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </form>

          {showDropdown ? (
            <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0E141B] md:w-[90%]">
              <ul className="py-2">
                  {correctedQuery ? (
                    <li key="didyoumean">
                      <button
                        type="button"
                        className={`w-full px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                          activeIdx === 0 ? "bg-gray-50 dark:bg-white/5" : ""
                        }`}
                        onMouseEnter={() => setActiveIdx(0)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToSearch(correctedQuery)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900 dark:text-gray-100">
                              Did you mean: <span className="underline underline-offset-4">{emphasizeTypedPart(correctedQuery, q)}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                              We’ll search using the corrected query.
                            </div>
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">
                            <IconChevronRight />
                          </span>
                        </div>
                      </button>
                    </li>
                  ) : null}

                  {visibleProductNames.map((p, idx) => {
                    const offset = correctedQuery ? 1 : 0;
                    const rowIdx = idx + offset;
                    const isActive = rowIdx === activeIdx;

                    return (
                      <li key={`${p.slug}-${idx}`}>
                        <button
                          type="button"
                          className={`w-full px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                            isActive ? "bg-gray-50 dark:bg-white/5" : ""
                          }`}
                          onMouseEnter={() => setActiveIdx(rowIdx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goToProduct(p.slug)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              {/* ✅ ONLY PRODUCT NAME */}
                              <div className="truncate font-medium text-gray-900 dark:text-gray-100">{emphasizeTypedPart(p.text, q)}</div>
                            </div>
                            <span className="text-gray-300 dark:text-gray-600">
                              <IconChevronRight />
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}

                  {!correctedQuery && visibleProductNames.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">No suggestions.</li>
                  ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          aria-label="Static context placeholder"
          className="hidden h-[38px] min-w-[128px] items-center justify-center rounded-full px-3 text-[12px] font-medium text-gray-500 dark:text-gray-300 md:inline-flex"
        >
          abc75b5a-5822-4de0-b291-1c469652dca8-1
        </div>

        <div className="hidden items-center gap-0.5 md:flex">
          <ActionLink icon={<IconHeart />} label="Wishlist" href="/wishlist" badge={0} />
          <ActionLink icon={<IconBag />} label="Cart" href="/cart" badge={cartCount} />

          {acctHover ? (
            <div className="pointer-events-none fixed inset-0 z-[90] bg-black/35 dark:bg-black/55" aria-hidden="true" />
          ) : null}

          <div className="relative z-[100]" onMouseEnter={acctOpenNow} onMouseLeave={acctCloseSoon}>
            <div className="rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-white/5">
              <span className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-800 transition hover:text-black dark:text-gray-100 dark:hover:text-white">
                <span className="relative">
                  <IconUser />
                </span>
                <span className="leading-none">{auth.isLoggedIn ? "Profile" : "Login"}</span>
              </span>
            </div>

            {acctHover ? (
              <div
                className="absolute right-0 top-[calc(100%+10px)] z-[110] w-[330px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl
                           backdrop-blur-0 bg-opacity-100
                           dark:border-white/10 dark:bg-[#0E141B]"
                onMouseEnter={acctOpenNow}
                onMouseLeave={acctCloseSoon}
              >
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-[#0B1118]">
                  <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                    {auth.isLoggedIn ? `Hi, ${auth.displayName}` : "Welcome"}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {auth.isLoggedIn ? `Email: ${auth.email}` : "Login to access orders, wishlist & more"}
                  </div>
                </div>

                <div className="p-4">
                  {!auth.isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="mb-1 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-[#0B1118]">
                        <button
                          type="button"
                          className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${authView === "login" ? "bg-white text-gray-900 dark:bg-white dark:text-black" : "text-gray-700 dark:text-gray-200"}`}
                          onClick={() => setAuthView("login")}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${authView === "signup" ? "bg-white text-gray-900 dark:bg-white dark:text-black" : "text-gray-700 dark:text-gray-200"}`}
                          onClick={() => setAuthView("signup")}
                        >
                          Sign Up
                        </button>
                      </div>

                      {authView === "login" ? (
                        <>
                          <input
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                          <input
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                            placeholder="Password"
                            type="password"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                          />

                          {loginErr ? <div className="text-xs text-red-600">{loginErr}</div> : null}
                          {signupOk ? <div className="text-xs text-green-700 dark:text-green-400">{signupOk}</div> : null}

                          <button
                            type="button"
                            className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
                            onClick={doLogin}
                            disabled={!loginReady}
                          >
                            Login
                          </button>

                          <button
                            type="button"
                            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
                            onClick={() => setAuthView("signup")}
                          >
                            Create account
                          </button>

                          <div className="mt-2 text-[11px] text-gray-700 dark:text-gray-300">
                            Dummy creds: <span className="font-semibold">user@mcart.com</span> /{" "}
                            <span className="font-semibold">test@123</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                            placeholder="Name"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                          />
                          <input
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                            placeholder="Email"
                            type="email"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                          />
                          <input
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                            placeholder="Password"
                            type="password"
                            value={signupPass}
                            onChange={(e) => setSignupPass(e.target.value)}
                          />
                          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={signupAccepted}
                              onChange={(e) => setSignupAccepted(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            I agree to Terms & Privacy Policy.
                          </label>
                          {signupErr ? <div className="text-xs text-red-600">{signupErr}</div> : null}

                          <button
                            type="button"
                            className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
                            onClick={doSignup}
                            disabled={!signupReady}
                          >
                            Submit
                          </button>

                          <button
                            type="button"
                            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
                            onClick={() => setAuthView("login")}
                          >
                            Back to Login
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-1">
                        {[
                          { label: "Profile", href: "/profile" },
                          { label: "Orders", href: "/orders" },
                          { label: "Wishlist", href: "/wishlist" },
                          { label: "Contact Us", href: "/contact" },
                          { label: "Coupons", href: "/coupons" },
                          { label: "Saved Address", href: "/addresses" },
                          { label: "Notifications", href: "/notifications" },
                          { label: "Become a Seller", href: "/seller" },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-white/5"
                            onClick={() => setAcctHover(false)}
                          >
                            <span>{item.label}</span>
                            <span className="text-gray-400 dark:text-gray-500">
                              <IconChevronRight />
                            </span>
                          </Link>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
                        onClick={doLogout}
                      >
                        Logout
                      </button>
                    </>
                  )}

                  {/* Theme toggle only here */}
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#0B1118]">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Theme</div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0E141B] dark:text-gray-100 dark:hover:bg-white/10"
                      >
                        {theme === "dark" ? <IconMoon /> : <IconSun />}
                        {theme === "dark" ? "Dark" : "Light"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Desktop categories bar + mega menu */}
      {!hideCategoryNav ? (
        <div
          className="relative hidden border-t border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F14] md:block"
          onMouseEnter={() => clearCloseTimer()}
          onMouseLeave={() => scheduleClose()}
        >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center border-b border-gray-200 py-2 dark:border-white/10">
            <nav className="flex w-full items-center">
              <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2">
                {visibleRoots.map((c) => (
                  <NavLink
                    key={c.id}
                    label={c.name}
                    href={makeSearchHrefBySlug(c.slug)}
                    active={activeRootId === c.id}
                    onHover={() => openRoot(c.id)}
                  />
                ))}

                {overflowRoots.length > 0 ? (
                  <div
                    className={`relative ${moreOpen ? "z-[140]" : ""}`}
                    onMouseEnter={() => setMoreOpen(true)}
                    onMouseLeave={() => setMoreOpen(false)}
                  >
                    <NavLink
                      label="More"
                      href="#"
                      active={overflowRoots.some((r) => r.id === activeRootId)}
                      onHover={() => setMoreOpen(true)}
                      rightIcon={<IconCaretDown />}
                    />

                    {moreOpen ? (
                      <>
                        <div className="absolute left-1/2 top-full z-[145] h-3 w-40 -translate-x-1/2" />

                        <div className="absolute left-1/2 top-[calc(100%+10px)] z-[150] w-[340px] -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0E141B]">
                          <div className="p-2">
                            {overflowRoots.map((r) => (
                              <Link
                                key={r.id}
                                href={makeSearchHrefBySlug(r.slug)}
                                className={`group relative block rounded-xl px-3 py-2 text-sm font-extrabold tracking-wide transition ${
                                  activeRootId === r.id
                                    ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-black dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white"
                                }`}
                                onMouseEnter={() => {
                                  setMoreOpen(true);
                                  openRoot(r.id);
                                }}
                                onClick={() => setMoreOpen(false)}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    <IconMore />
                                  </span>
                                  <span className="relative">
                                    {r.name}
                                    <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-black transition-transform duration-200 ease-out group-hover:scale-x-100 dark:bg-white" />
                                  </span>
                                </span>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600">
                                  <IconChevronRight />
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        </div>

        {activeRoot ? (
          <div className="absolute left-0 right-0 top-full z-[120] border-t border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0E141B]">
            <div className="mx-auto max-w-7xl px-4 py-5">
              <div className="mb-4 flex items-center justify-between">
                <Breadcrumb
                  items={breadcrumbItems}
                  onClose={() => {
                    setActiveRootId(null);
                    setPathIds([]);
                  }}
                />
              </div>

              <div className="overflow-hidden">
                <div className="grid grid-flow-col auto-cols-[240px] gap-4">
                  {columns.cols.map((nodes: CategoryNode[], depth: number) => {
                    const header =
                      depth === 0 ? `Shop in ${activeRoot.name}` : `In ${columns.headers[depth] ?? activeRoot.name}`;

                    return (
                      <div
                        key={`col-${depth}`}
                        className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="mb-2 text-[12px] font-extrabold tracking-[0.08em] text-gray-900 dark:text-gray-100">
                          {header}
                        </div>

                        <div className="max-h-[340px] space-y-1 overflow-auto pr-1">
                          {nodes.map((n: CategoryNode) => {
                            const selected = pathIds[depth] === n.id;
                            const hasKids = n.children.length > 0;

                            return (
                              <div key={n.id} className="flex items-center justify-between gap-2">
                                <Link
                                  href={makeSearchHrefBySlug(n.slug)}
                                  onMouseEnter={() => onHoverNode(depth, n.id)}
                                  onClick={() => {
                                    setActiveRootId(null);
                                    setPathIds([]);
                                  }}
                                  className={`flex-1 rounded-xl px-2 py-2 text-sm transition ${
                                    selected
                                      ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                                      : "text-gray-700 hover:bg-gray-50 hover:text-black dark:text-gray-200 dark:hover:bg-white/5"
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <span className="text-gray-400 dark:text-gray-500">
                                      <IconDot />
                                    </span>
                                    {n.name}
                                  </span>
                                </Link>

                                {hasKids ? (
                                  <span className="flex-none rounded-lg p-2 text-gray-400 dark:text-gray-500" aria-hidden="true">
                                    <IconChevronRight />
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <style>{`
                .max-h-\\[340px\\]::-webkit-scrollbar { width: 0px; height: 0px; }
              `}</style>
            </div>
          </div>
        ) : null}
        </div>
      ) : null}

      {!hideCategoryNav && navOpen ? (
        <div className="border-t border-gray-200 bg-white dark:border-white/10 dark:bg-[#0E141B] md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Categories</div>
              <button
                type="button"
                className="rounded-md border border-gray-200 px-3 py-1 text-sm dark:border-white/10"
                onClick={() => setNavOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {catRoots.map((root) => (
                <details key={root.id} className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {root.name}
                  </summary>

                  <div className="mt-3 space-y-2">
                    <Link
                      href={makeSearchHrefBySlug(root.slug)}
                      className="inline-block rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                      onClick={() => setNavOpen(false)}
                    >
                      View all {root.name}
                    </Link>

                    {root.children.map((sub) => (
                      <div key={sub.id}>
                        <Link
                          href={makeSearchHrefBySlug(sub.slug)}
                          className="text-sm font-semibold text-gray-900 hover:underline underline-offset-4 dark:text-gray-100"
                          onClick={() => setNavOpen(false)}
                        >
                          {sub.name}
                        </Link>

                        {sub.children.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {sub.children.slice(0, 24).map((leaf) => (
                              <Link
                                key={leaf.id}
                                href={makeSearchHrefBySlug(leaf.slug)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                                onClick={() => setNavOpen(false)}
                              >
                                {leaf.name}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

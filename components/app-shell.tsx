"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  ArrowRight,
  Car,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "@/lib/icons";
import { useProduct } from "./product-context";
import { WorkshopHelp } from "./workshop-help";
import { SavedRecordNotice } from "./saved-record-notice";

const dailyNav = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cars", href: "/cars", icon: Car },
  { label: "Money book", href: "/payments", icon: HandCoins },
  { label: "People", href: "/people", icon: Users },
];
const documentNav = [
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Supplier bills", href: "/bills", icon: ShoppingBag },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, error, refresh } = useProduct();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    // Start new screens at their heading and back link. In-page record links
    // keep their own anchor, and the tutorial focuses its target after arrival.
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  useEffect(() => {
    try {
      setSidebarCollapsed(
        localStorage.getItem("asaan-sidebar-collapsed") === "true",
      );
    } catch {
      /* Navigation still works when browser storage is unavailable. */
    }
  }, []);
  function toggleSidebar() {
    const collapsed = !sidebarCollapsed;
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem("asaan-sidebar-collapsed", String(collapsed));
    } catch {
      /* Keep the current session preference. */
    }
  }
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const results = [
    ...(data?.vehicles || []).map((v) => ({
      label: v.displayName || v.plateNumber || "Car details to add",
      detail: [v.customerName, v.make, v.model, v.vin]
        .filter(Boolean)
        .join(" · "),
      href: `/cars/${v.id}`,
    })),
    ...(data?.ledger.people || []).map((p) => ({
      label: p.name,
      detail: p.phone || "Person",
      href: `/people/${p.id}`,
    })),
    ...(data?.invoices || []).map((i) => ({
      label: i.number,
      detail: `Customer invoice · ${i.customer.name}`,
      href: `/invoices/${i.id}`,
    })),
    ...(data?.quotations || []).map((q) => ({
      label: q.number,
      detail: `Quotation · ${q.customer.name}`,
      href: `/quotations/${q.id}`,
    })),
    ...(data?.billBook?.bills || []).map((bill) => ({
      label:
        bill.number ||
        (bill.direction === "PURCHASE"
          ? "Supplier bill without number"
          : "Customer invoice without number"),
      detail: `${bill.direction === "PURCHASE" ? "Supplier bill" : "Customer invoice"} · ${bill.personName || "Person to add"}`,
      href: `/bills/${bill.id}`,
    })),
  ]
    .filter((r) =>
      `${r.label} ${r.detail}`.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 8);
  const recordedSale = data?.billBook.bills.some(
    (bill) => bill.direction === "SALE" && path === `/bills/${bill.id}`,
  );
  const item = (entry: (typeof dailyNav)[number]) => {
    const Icon = entry.icon;
    const active =
      entry.href === "/bills" && recordedSale
        ? false
        : path === entry.href ||
          path.startsWith(entry.href + "/") ||
          (entry.href === "/invoices" && recordedSale);
    return (
      <Link
        className={clsx("nav-link", active && "active")}
        key={entry.href}
        href={entry.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={22} weight={active ? "fill" : "regular"} />
        <span>{entry.label}</span>
      </Link>
    );
  };
  return (
    <div
      className={clsx(
        "app-shell workshop-shell",
        sidebarCollapsed && "sidebar-collapsed",
      )}
    >
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        className={clsx("sidebar", open && "mobile-open")}
      >
        <div className="brand-row">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark">م</span>
            <span>Asaan Hisaab</span>
          </Link>
          <button
            className="mobile-close icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>
        <p className="workshop-name">
          {data?.organisation.name || "Your workshop"}
        </p>
        <nav
          className="primary-nav"
          aria-label="Main menu"
          data-help="main-menu"
        >
          {dailyNav.map(item)}
          <div className="nav-space" />
          {documentNav.map(item)}
        </nav>
        <div className="sidebar-footer">
          <Link
            className="nav-link"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings size={22} />
            More & settings
          </Link>
          <p className="workspace-mode">
            {data?.storage?.mode === "shared"
              ? "Shared database"
              : "Saved on this computer"}
          </p>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="desktop-sidebar-toggle icon-button"
            data-help="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Open sidebar" : "Hide sidebar"}
            title={sidebarCollapsed ? "Open sidebar" : "Hide sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-sidebar"
          >
            <Menu size={23} />
          </button>
          <button
            className="mobile-menu icon-button"
            data-help="sidebar-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="workspace-sidebar"
          >
            <Menu size={23} />
          </button>
          <div className="workshop-search" data-help="global-search">
            <label className="search-field">
              <Search size={20} aria-hidden="true" />
              <input
                className="search-input"
                type="search"
                aria-label="Search cars, people, invoices and supplier bills"
                placeholder="Find a car, person or document"
                value={search}
                onFocus={() => setSearching(true)}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={18} />
                </button>
              )}
            </label>
            {searching && search && (
              <div className="workshop-search-results">
                {results.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={() => {
                      setSearching(false);
                      setSearch("");
                    }}
                  >
                    <strong>{r.label}</strong>
                    <small>{r.detail}</small>
                  </Link>
                ))}
                {!results.length && (
                  <p>No matches. Try a name or car number.</p>
                )}
                <button
                  className="text-link"
                  onClick={() => setSearching(false)}
                >
                  Close search
                </button>
              </div>
            )}
          </div>
          <Link
            className="button primary topbar-add"
            href="/payments/new"
            data-help="add-record"
          >
            <Plus size={18} /> Add record
          </Link>
        </header>
        {error && (
          <div className="refresh-warning" role="alert">
            The latest records could not load. Your saved records are still
            shown. <button onClick={() => void refresh()}>Try again</button>
            <small>{error}</small>
          </div>
        )}
        <main id="workspace-main" data-help="workspace-main">
          <Suspense fallback={null}>
            <SavedRecordNotice />
          </Suspense>
          {children}
        </main>
      </div>
      <nav
        className="mobile-bottom-nav"
        aria-label="Quick navigation"
        data-help="main-menu"
      >
        {dailyNav.map(item)}
      </nav>
      <WorkshopHelp />
    </div>
  );
}
export function PageHeader({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">
        {secondary}
        {primaryHref && (
          <Link className="button primary" href={primaryHref}>
            <Plus size={16} />
            {primaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={clsx("status-pill", status.toLowerCase().replaceAll("_", "-"))}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

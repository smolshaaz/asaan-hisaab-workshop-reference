"use client";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Car,
  FileText,
  ReceiptText,
} from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { LedgerHistory } from "@/components/ledger-history";
import { TodayActions } from "@/components/today-actions";
import { money } from "@/lib/format";
import { riyadhDate } from "@/lib/business-date";

export default function DashboardPage() {
  const { data, loading } = useProduct();
  if (loading || !data)
    return (
      <div className="page daily-page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  const today = riyadhDate();
  const ledger = data.ledger;
  const todayEntries = [...ledger.entries, ...ledger.legacyEntries].filter(
    (e) => e.entryDate === today,
  );
  const incoming =
    todayEntries.reduce((s, e) => s + Math.round(e.cashIn * 100), 0) / 100;
  const outgoing =
    todayEntries.reduce((s, e) => s + Math.round(e.cashOut * 100), 0) / 100;
  const drafts = [
    ...data.invoices
      .filter((i) => i.status === "DRAFT")
      .map((i) => ({
        id: i.id,
        number: i.number,
        name: i.customer.name,
        href: `/invoices/${i.id}/edit`,
        createdAt: i.createdAt,
      })),
    ...data.quotations
      .filter((q) => q.status === "DRAFT")
      .map((q) => ({
        id: q.id,
        number: q.number,
        name: q.customer.name,
        href: `/quotations/${q.id}/edit`,
        createdAt: q.createdAt,
      })),
    ...data.billBook.bills
      .filter((bill) => bill.status === "DRAFT")
      .map((bill) => ({
        id: bill.id,
        number:
          bill.number ||
          (bill.direction === "PURCHASE"
            ? "Supplier bill draft"
            : "Customer invoice draft"),
        name:
          bill.personName ||
          (bill.direction === "PURCHASE"
            ? "Supplier to add"
            : "Customer to add"),
        href: `/bills/${bill.id}`,
        createdAt: bill.createdAt,
      })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="page daily-page today-page">
      <div className="daily-heading">
        <h1>Today at the workshop</h1>
        <p>
          {new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · Record it while you remember.
        </p>
      </div>
      <div data-help="today-actions" className="today-primary-actions">
        <Link href="/payments/new?direction=IN" className="received-action">
          <ArrowDownRight size={32} />
          <span>
            <strong>Money received</strong>
            <small>Someone paid or returned money</small>
          </span>
          <ArrowRight size={23} />
        </Link>
        <Link href="/payments/new?direction=OUT" className="paid-action">
          <ArrowUpRight size={32} />
          <span>
            <strong>Money paid</strong>
            <small>Bought something or gave money</small>
          </span>
          <ArrowRight size={23} />
        </Link>
      </div>
      <div className="today-quick-links">
        <Link href="/cars">
          <Car size={23} />
          <span>Cars & work</span>
        </Link>
        <Link href="/quotations/new">
          <FileText size={23} />
          <span>Make quotation</span>
        </Link>
        <Link href="/invoices/new">
          <ReceiptText size={23} />
          <span>Make invoice</span>
        </Link>
      </div>
      <TodayActions data={data} today={today} />
      <section data-help="today-money" className="today-money">
        <div className="section-title">
          <h2>Today’s money</h2>
          <Link className="text-link" href="/payments">
            Full history <ArrowRight size={16} />
          </Link>
        </div>
        <div className="today-money-numbers">
          <div>
            <span>Came in</span>
            <strong>{money(incoming)}</strong>
          </div>
          <div>
            <span>Went out</span>
            <strong>{money(outgoing)}</strong>
          </div>
          <div>
            <span>
              {incoming - outgoing < 0 ? "More went out" : "Difference"}
            </span>
            <strong>{money(Math.abs(incoming - outgoing))}</strong>
          </div>
        </div>
        <p>
          Recorded money movement. This does not tell us the profit or how much
          cash is in the drawer.
        </p>
      </section>
      <section data-help="today-history">
        <div className="section-title">
          <h2>Latest records</h2>
          <Link className="text-link" href="/payments">
            See all <ArrowRight size={16} />
          </Link>
        </div>
        <LedgerHistory entries={ledger.entries.slice(0, 5)} compact />
      </section>
      {drafts.length > 0 && (
        <section className="unfinished-drafts">
          <div className="section-title">
            <h2>Finish later</h2>
            <span>{drafts.length} saved drafts</span>
          </div>
          {drafts.slice(0, 3).map((d) => (
            <Link key={d.id} href={d.href}>
              <span>
                <strong>{d.number}</strong>
                <small>{d.name}</small>
              </span>
              <span>
                Continue <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

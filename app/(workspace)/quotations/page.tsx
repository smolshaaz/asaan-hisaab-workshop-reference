"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Plus, Search, TriangleAlert } from "@/lib/icons";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { money, shortDate } from "@/lib/format";
export default function QuotationsPage() {
  const { data, loading, error, refresh } = useProduct();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const rows = useMemo(
    () =>
      data?.quotations.filter((q) => {
        const searchText = [
          q.number,
          q.customer.name,
          q.customer.email,
          q.customer.phone,
          q.status,
          q.issueDate,
          q.expiryDate,
          q.total,
          q.subtotal,
          q.vatTotal,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (status === "ALL" || q.status === status) &&
          searchText.includes(query.toLowerCase())
        );
      }) || [],
    [data, query, status],
  );
  return (
    <div className="page">
      <PageHeader
        title="Quotations"
        description="Create customer offers and turn them into invoices."
        primaryHref="/quotations/new"
        primaryLabel="New quotation"
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : error ? (
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h2>Quotations could not load</h2>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : (
        <section data-help="quotations-list" className="panel register-panel flush">
          <div className="register-toolbar">
            <div className="filter-tabs" aria-label="Filter quotations">
              <button
                aria-pressed={status === "ALL"}
                className={status === "ALL" ? "active" : ""}
                onClick={() => setStatus("ALL")}
              >
                All
              </button>
              {[
                "DRAFT",
                "SENT",
                "ACCEPTED",
                "DECLINED",
                "EXPIRED",
                "CONVERTED",
              ].map((value) => (
                <button
                  key={value}
                  aria-pressed={status === value}
                  className={status === value ? "active" : ""}
                  onClick={() => setStatus(value)}
                >
                  {value.toLowerCase()}
                </button>
              ))}
            </div>
            <label className="compact-search">
              <Search size={16} />
              <span className="sr-only">Search quotations</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search quotations"
              />
            </label>
          </div>
          {rows.length ? (
            <div className="quotation-register-list" role="list">
              {rows.map((quote) => (
                <Link
                  className="quotation-register-card"
                  href={`/quotations/${quote.id}`}
                  key={quote.id}
                  role="listitem"
                  aria-label={`Open quotation ${quote.number} for ${quote.customer.name}`}
                >
                  <span className="quotation-register-main">
                    <strong>{quote.customer.name}</strong>
                    <small>
                      {shortDate(quote.issueDate)} · {quote.number}
                    </small>
                  </span>
                  <span className="quotation-register-validity">
                    <small>{quote.expiryDate ? "Valid until" : "Validity"}</small>
                    <strong>
                      {quote.expiryDate ? shortDate(quote.expiryDate) : "No expiry"}
                    </strong>
                  </span>
                  <strong className="quotation-register-amount">
                    {money(quote.total)}
                  </strong>
                  <StatusPill status={quote.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={30} />
              <h3>No matching quotations</h3>
              <p>Create an offer or clear the current filters.</p>
              <Link className="button primary" href="/quotations/new">
                <Plus size={16} />
                New quotation
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

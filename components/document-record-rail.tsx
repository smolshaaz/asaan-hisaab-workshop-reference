"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { StatusPill } from "@/components/app-shell";
import { signedFiscalAmount } from "@/lib/calculations";
import { money, shortDate } from "@/lib/format";
import { Plus, Search } from "@/lib/icons";
import type { InvoiceRecord, QuotationRecord } from "@/lib/product-types";

export type DocumentRecordRailProps =
  | {
      kind: "invoice";
      activeId: string;
      records: readonly InvoiceRecord[];
    }
  | {
      kind: "quotation";
      activeId: string;
      records: readonly QuotationRecord[];
    };

interface RecordRailItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  status: string;
  amount: string;
  cue: string;
  due?: string;
  searchText: string;
}

const searchableText = (...parts: Array<string | undefined>) =>
  parts.filter(Boolean).join(" ").toLocaleLowerCase();

export function DocumentRecordRail(props: DocumentRecordRailProps) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const isInvoice = props.kind === "invoice";
  const singularLabel = isInvoice ? "invoice" : "quotation";
  const pluralLabel = isInvoice ? "Invoices" : "Quotations";
  const baseHref = isInvoice ? "/invoices" : "/quotations";

  const items = useMemo<RecordRailItem[]>(() => {
    if (props.kind === "invoice") {
      return props.records.map((record) => {
        const total = signedFiscalAmount(record.documentType, record.total);
        const balance = signedFiscalAmount(
          record.documentType,
          record.total - record.paidAmount - record.badDebtAmount,
        );
        const settled = Math.abs(balance) < 0.005;
        const cue =
          record.documentType === "CREDIT_NOTE"
            ? `Credit balance ${money(Math.abs(balance), record.currency)}`
            : settled
              ? "Paid in full"
              : `Balance ${money(balance, record.currency)}`;
        const due =
          record.documentType !== "CREDIT_NOTE" && !settled && record.dueDate
            ? `Due ${shortDate(record.dueDate)}`
            : undefined;

        return {
          id: record.id,
          number: record.number,
          customer: record.customer.name,
          date: shortDate(record.issueDate),
          status: record.status,
          amount: money(total, record.currency),
          cue,
          due,
          searchText: searchableText(
            record.number,
            record.customer.name,
            record.customer.email,
            record.customer.phone,
            record.status.replaceAll("_", " "),
            record.documentType.replaceAll("_", " "),
            String(record.badDebtAmount),
            record.issueDate,
            record.dueDate,
          ),
        };
      });
    }

    return props.records.map((record) => ({
      id: record.id,
      number: record.number,
      customer: record.customer.name,
      date: shortDate(record.issueDate),
      status: record.status,
      amount: money(record.total, record.currency),
      cue: record.expiryDate
        ? `Expires ${shortDate(record.expiryDate)}`
        : "No expiry",
      searchText: searchableText(
        record.number,
        record.customer.name,
        record.customer.email,
        record.status.replaceAll("_", " "),
        record.issueDate,
        record.expiryDate,
      ),
    }));
  }, [props]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = normalizedQuery
    ? items.filter((item) => item.searchText.includes(normalizedQuery))
    : items;
  const resultLabel = `${visibleItems.length} ${
    visibleItems.length === 1 ? singularLabel : pluralLabel.toLocaleLowerCase()
  }`;

  return (
    <aside className="record-rail-shell" aria-label={`${pluralLabel} records`}>
      <div className="record-rail-header">
        <div className="record-rail-heading">
          <h2 className="record-rail-title">{pluralLabel}</h2>
          <span
            className="record-rail-count"
            aria-label={`${items.length} total ${pluralLabel.toLocaleLowerCase()}`}
          >
            {items.length}
          </span>
        </div>
        <Link
          className="record-rail-create"
          href={`${baseHref}/new`}
          aria-label={`Create ${singularLabel}`}
        >
          <Plus size={16} aria-hidden="true" />
          <span>New</span>
        </Link>
      </div>

      <div className="record-rail-search">
        <Search
          className="record-rail-search-icon"
          size={16}
          aria-hidden="true"
        />
        <input
          className="record-rail-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${pluralLabel.toLocaleLowerCase()}`}
          aria-label={`Search ${pluralLabel.toLocaleLowerCase()}`}
          aria-controls={listId}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <p className="record-rail-results" aria-live="polite">
        {resultLabel}
      </p>

      <nav
        id={listId}
        className="record-rail-list"
        aria-label={`${pluralLabel} list`}
      >
        {visibleItems.length ? (
          visibleItems.map((item) => {
            const active = item.id === props.activeId;

            return (
              <Link
                key={item.id}
                className={`record-rail-item${
                  active ? " record-rail-item-active" : ""
                }`}
                href={`${baseHref}/${item.id}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="sr-only">Open {singularLabel}: </span>
                <span className="record-rail-item-topline">
                  <strong className="record-rail-number">{item.number}</strong>
                  <StatusPill status={item.status} />
                </span>
                <span className="record-rail-customer">{item.customer}</span>
                <span className="record-rail-item-meta">
                  <span className="record-rail-date">{item.date}</span>
                  <strong className="record-rail-amount">{item.amount}</strong>
                </span>
                <span className="record-rail-cues">
                  <span className="record-rail-cue">{item.cue}</span>
                  {item.due && (
                    <span className="record-rail-due">{item.due}</span>
                  )}
                </span>
              </Link>
            );
          })
        ) : (
          <p className="record-rail-empty">
            No {pluralLabel.toLocaleLowerCase()} match “{query.trim()}”.
          </p>
        )}
      </nav>
    </aside>
  );
}

export default DocumentRecordRail;

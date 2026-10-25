"use client";

import { SettingsBackLink } from "@/components/settings-back-link";
import Link from "next/link";
import { ChartBar } from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { documentAccountItems } from "@/lib/account-summary";
import { money, shortDate } from "@/lib/format";
import { riyadhDate } from "@/lib/business-date";

export default function ReceivablesReport() {
  const { data, loading } = useProduct();
  const documents = data ? documentAccountItems(data) : [];
  const open = documents
    .filter((item) => item.collectable && item.balance > 0)
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        b.balance - a.balance,
    );
  const credits = documents.filter(
    (item) => item.source === "INVOICE" && item.balance < 0,
  );
  const pending = documents.filter(
    (item) =>
      item.source === "INVOICE" && !item.collectable && item.balance > 0,
  );
  const buckets = { current: 0, due30: 0, due60: 0, older: 0, unknown: 0 };
  const today = new Date(`${riyadhDate()}T00:00:00Z`).getTime();
  for (const item of open) {
    const amount = Math.round(item.balance * 100);
    if (!item.dueDate) {
      buckets.unknown += amount;
      continue;
    }
    const days = Math.floor(
      (today - new Date(`${item.dueDate}T00:00:00Z`).getTime()) / 86400000,
    );
    if (days <= 0) buckets.current += amount;
    else if (days <= 30) buckets.due30 += amount;
    else if (days <= 60) buckets.due60 += amount;
    else buckets.older += amount;
  }
  return (
    <div data-help="receivables-report" className="page">
      <SettingsBackLink />
      <PageHeader
        title="Customer money to collect"
        description="Invoices made here and recorded customer bills, with their current amounts left."
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : (
        <>
          <section className="metric-strip">
            <article>
              <span>Due today / later</span>
              <strong>{money(buckets.current / 100)}</strong>
            </article>
            <article>
              <span>1–30 days overdue</span>
              <strong>{money(buckets.due30 / 100)}</strong>
            </article>
            <article>
              <span>31–60 days overdue</span>
              <strong>{money(buckets.due60 / 100)}</strong>
            </article>
            <article>
              <span>61+ days overdue</span>
              <strong>{money(buckets.older / 100)}</strong>
            </article>
          </section>
          {buckets.unknown > 0 && (
            <div className="info-strip warning">
              <ChartBar size={19} />
              <span>
                <strong>
                  {money(buckets.unknown / 100)} has no payment date.
                </strong>{" "}
                Open these records to agree a date. This amount is separate from
                the dated groups above.
              </span>
            </div>
          )}
          {credits.length > 0 && (
            <details className="history-options">
              <summary>
                Customer credits to check ·{" "}
                {money(
                  credits.reduce(
                    (sum, item) => sum + Math.round(-item.balance * 100),
                    0,
                  ) / 100,
                )}
              </summary>
              <p>
                These credits have not been automatically deducted from
                individual invoice rows. Check the person’s full account before
                collecting.
              </p>
              {credits.map((item) => (
                <p key={item.id}>
                  <Link href={item.href}>
                    {item.personName} · {item.title} · {money(-item.balance)}{" "}
                    credit
                  </Link>
                </p>
              ))}
            </details>
          )}
          {pending.length > 0 && (
            <details className="history-options">
              <summary>
                {pending.length} invoice{pending.length === 1 ? " is" : "s are"}{" "}
                not ready to collect
              </summary>
              <p>
                These invoices are awaiting clearance and are excluded from the
                collection totals.
              </p>
              {pending.map((item) => (
                <p key={item.id}>
                  <Link href={item.href}>
                    {item.personName} · {item.title} · {money(item.balance)}
                  </Link>
                </p>
              ))}
            </details>
          )}
          <section className="panel register-panel">
            {open.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Customer</th>
                      <th>Payment date</th>
                      <th className="numeric">Left to collect</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.map((item) => (
                      <tr key={`${item.source}:${item.id}`}>
                        <td>
                          <Link className="document-number" href={item.href}>
                            {item.title}
                          </Link>
                          <div className="muted">
                            {item.source === "BILL"
                              ? "Recorded customer bill"
                              : "Invoice made here"}
                          </div>
                        </td>
                        <td>
                          {item.personId ? (
                            <Link href={`/people/${item.personId}`}>
                              {item.personName}
                            </Link>
                          ) : (
                            item.personName
                          )}
                        </td>
                        <td>
                          {item.dueDate
                            ? shortDate(item.dueDate)
                            : "Date to agree"}
                        </td>
                        <td className="numeric">
                          <strong>{money(item.balance)}</strong>
                        </td>
                        <td>
                          <Link className="text-link" href={item.href}>
                            Open record
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <ChartBar size={30} />
                <h3>No open customer invoices ready to collect</h3>
                <p>
                  Other money-book debts and advances are shown in each person’s
                  account.
                </p>
                <Link href="/people" className="text-link">
                  Open People
                </Link>
              </div>
            )}
          </section>
          <p className="plain-note">
            Amounts left already include document payments, agreed settlements
            and write-offs. A worker may still hold a collected payment. These
            totals are neither workshop cash nor profit.{" "}
            <Link href="/people">See all person accounts</Link>
          </p>
        </>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { FileMinus, Plus } from "@/lib/icons";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { money, shortDate } from "@/lib/format";
export default function NotesPage() {
  const { data, loading } = useProduct();
  const notes =
    data?.invoices.filter((i) => i.documentType !== "INVOICE") || [];
  return (
    <div className="page">
      <PageHeader
        title="Credit and debit notes"
        description="Lawful corrections linked to immutable original invoices."
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : (
        <section className="panel register-panel">
          {notes.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Note</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link
                          className="document-number"
                          href={`/invoices/${n.id}`}
                        >
                          {n.number}
                        </Link>
                      </td>
                      <td>{n.customer.name}</td>
                      <td>{n.documentType.replaceAll("_", " ")}</td>
                      <td>{shortDate(n.issueDate)}</td>
                      <td className="numeric">{money(n.total)}</td>
                      <td>
                        <StatusPill status={n.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FileMinus size={30} />
              <h3>No tax notes</h3>
              <p>
                Open an immutable invoice to start a linked credit or debit
                note.
              </p>
              <Link className="button primary" href="/invoices">
                <Plus size={16} />
                Open invoices
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

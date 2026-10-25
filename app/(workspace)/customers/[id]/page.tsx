"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Building2, MapPin, ReceiptText, Car, FileText, TriangleAlert } from "@/lib/icons";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { CustomerQuickEdit } from "@/components/customer-quick-create";
import { money, shortDate } from "@/lib/format";

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refresh } = useProduct();

  if (loading) {
    return <div className="page"><div className="skeleton large-skeleton" /></div>;
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h2>Workspace could not load</h2>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>Try again</button>
        </div>
      </div>
    );
  }

  const customer = data.customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="page">
        <div className="state-page error-state">
          <Users size={28} />
          <h2>Customer not found</h2>
          <Link className="button secondary" href="/customers">Return to customers</Link>
        </div>
      </div>
    );
  }

  const cars = data.vehicles.filter((c) => c.customerId === id || c.customerName === customer.name);
  const quotes = data.quotations.filter((q) => q.customerId === id);
  const invoices = data.invoices.filter((i) => i.customerId === id);

  return (
    <div className="page">
      <div className="page-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
        <div>
          <Link href="/customers" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', marginBottom: '12px', textDecoration: 'none', fontSize: '14px' }}>
            <ArrowLeft size={16} />
            Back to customers
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', margin: 0 }}>{customer.name}</h1>
            <StatusPill status={customer.status} />
          </div>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--muted)' }}>
            {customer.phone || "No phone"} • {customer.email || "No email"}
          </p>
        </div>
        <div className="page-actions">
           <CustomerQuickEdit customer={customer} />
           <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>Outstanding Balance</span>
              <strong style={{ fontSize: '24px', color: customer.outstanding > 0 ? 'var(--destructive)' : 'var(--text)' }}>
                {money(customer.outstanding)}
              </strong>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', margin: '32px 0' }}>
        
        {/* Vehicles Section */}
        <section className="panel register-panel flush" style={{ gridColumn: '1 / -1' }}>
          <div className="register-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={20} />
              <strong>Registered Vehicles ({cars.length})</strong>
            </div>
          </div>
          {cars.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Plate Number</th>
                    <th>Make & Model</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <tr key={car.id} onClick={() => router.push(`/cars/${car.id}`)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td><strong>{car.plateNumber}</strong></td>
                      <td>{[car.make, car.model].filter(Boolean).join(" ") || "Unknown model"}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/cars/${car.id}`} className="button secondary" onClick={(e) => e.stopPropagation()}>
                          View History
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Car size={24} color="var(--muted)" />
              <p>No vehicles registered to this customer.</p>
              <Link href="/cars" className="button secondary">Add Vehicle</Link>
            </div>
          )}
        </section>

        {/* Quotes Section */}
        <section className="panel register-panel flush">
          <div className="register-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} />
              <strong>Recent Quotes ({quotes.length})</strong>
            </div>
          </div>
          {quotes.length > 0 ? (
            <div className="table-scroll">
              <table>
                <tbody>
                  {quotes.slice(0, 5).map((q) => (
                    <tr key={q.id} onClick={() => router.push(`/quotations/${q.id}`)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td>
                        <strong>{q.number}</strong>
                        <small>{shortDate(q.issueDate)}</small>
                      </td>
                      <td><StatusPill status={q.status} /></td>
                      <td className="numeric"><strong>{money(q.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>No quotes found.</p>
            </div>
          )}
        </section>

        {/* Invoices Section */}
        <section className="panel register-panel flush">
          <div className="register-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReceiptText size={20} />
              <strong>Recent Invoices ({invoices.length})</strong>
            </div>
          </div>
          {invoices.length > 0 ? (
            <div className="table-scroll">
              <table>
                <tbody>
                  {invoices.slice(0, 5).map((i) => (
                    <tr key={i.id} onClick={() => router.push(`/invoices/${i.id}`)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td>
                        <strong>{i.number}</strong>
                        <small>{shortDate(i.issueDate)}</small>
                      </td>
                      <td><StatusPill status={i.status} /></td>
                      <td className="numeric"><strong>{money(i.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>No invoices found.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

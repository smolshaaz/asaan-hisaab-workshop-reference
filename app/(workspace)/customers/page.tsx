"use client";
import { SettingsBackLink } from "@/components/settings-back-link";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Plus,
  Search,
  TriangleAlert,
} from "@/lib/icons";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { money } from "@/lib/format";
export default function CustomersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, error, refresh } = useProduct();
  const [query, setQuery] = useState(params.get("query") || "");
  useEffect(() => {
    setQuery(params.get("query") || "");
  }, [params]);
  const customers = useMemo(
    () =>
      data?.customers.filter((c) =>
        (c.name + (c.vatNumber || "") + (c.email || "") + (c.phone || ""))
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) || [],
    [data, query],
  );
  return (
    <div className="page">
      <SettingsBackLink />
      <PageHeader
        title="Customer invoice details"
        description="Names, contact details and addresses used on customer invoices."
        primaryHref="/customers/new"
        primaryLabel="New customer"
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : error ? (
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h2>Customers could not load</h2>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : (
        <section
          data-help="customers-list"
          className="panel register-panel flush"
        >
          <div className="register-toolbar">
            <strong>{customers.length} customers</strong>
            <label className="compact-search">
              <Search size={16} />
              <span className="sr-only">Search customers</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer"
              />
            </label>
          </div>
          {customers.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>VAT identity</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      style={{ cursor: "pointer" }}
                      className="hover-row"
                    >
                      <td>
                        <strong>{customer.name}</strong>
                        <small lang="ar" dir="rtl">
                          {customer.nameAr}
                        </small>
                      </td>
                      <td>
                        {customer.vatNumber || "Non VAT-registered"}
                        <small>
                          {customer.additionalId &&
                            `${customer.additionalIdType || "ID"} ${customer.additionalId}`}
                        </small>
                      </td>
                      <td>
                        {customer.address?.city || "Not set"}
                        <small>{customer.address?.postalCode}</small>
                      </td>
                      <td>
                        {customer.phone || "No phone"}
                        <small>{customer.email || "No email"}</small>
                      </td>
                      <td className="numeric">
                        <strong>{money(customer.outstanding)}</strong>
                      </td>
                      <td>
                        <StatusPill status={customer.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Building2 size={30} />
              <h3>No customers found</h3>
              <p>Add a customer before creating a quotation or invoice.</p>
              <Link className="button primary" href="/customers/new">
                <Plus size={16} />
                New customer
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

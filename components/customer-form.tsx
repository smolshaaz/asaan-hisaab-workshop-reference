"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save, TriangleAlert, UserRoundPlus } from "@/lib/icons";
import { useProduct } from "./product-context";
import type { CustomerRecord } from "@/lib/product-types";
export function CustomerForm() {
  const router = useRouter();
  const { mutate } = useProduct();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    email: "",
    phone: "",
    vatNumber: "",
    additionalIdType: "CRN",
    additionalId: "",
    street: "",
    buildingNumber: "",
    district: "",
    city: "",
    postalCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await mutate<CustomerRecord>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          nameAr: form.nameAr || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          vatNumber: form.vatNumber || undefined,
          additionalIdType: form.additionalId
            ? form.additionalIdType
            : undefined,
          additionalId: form.additionalId || undefined,
          address: [
            form.street,
            form.buildingNumber,
            form.district,
            form.city,
            form.postalCode,
          ].some(Boolean)
            ? {
                street: form.street,
                buildingNumber: form.buildingNumber,
                district: form.district,
                city: form.city,
                postalCode: form.postalCode,
                countryCode: "SA",
              }
            : undefined,
        }),
      });
      router.push("/customers");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Customer could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page">
      <div className="editor-header">
        <div>
          <Link href="/customers" className="back-link">
            <ArrowLeft size={16} />
            Customers
          </Link>
          <h1>New customer</h1>
          <p>
            Store the legal identity and national-address fields used by
            supported tax documents.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => void submit()}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? "Saving" : "Save customer"}
        </button>
      </div>
      {error && (
        <div className="inline-alert error" role="alert">
          <TriangleAlert size={18} />
          {error}
        </div>
      )}
      <section className="form-panel">
        <div className="section-title icon-title">
          <UserRoundPlus size={21} />
          <div>
            <h2>Customer identity</h2>
            <p>Use the exact registered legal name and identifiers.</p>
          </div>
        </div>
        <div className="form-grid three">
          <label>
            Legal name
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </label>
          <label>
            Arabic legal name
            <input
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => set("nameAr", e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Mobile or WhatsApp"
            />
          </label>
          <label>
            VAT number
            <input
              inputMode="numeric"
              value={form.vatNumber}
              onChange={(e) => set("vatNumber", e.target.value)}
              placeholder="3xxxxxxxxxxxxx3"
            />
          </label>
          <label>
            Legal identifier type
            <select
              value={form.additionalIdType}
              onChange={(e) => set("additionalIdType", e.target.value)}
            >
              <option value="CRN">Commercial registration</option>
              <option value="MOM">Municipality license</option>
              <option value="MLS">MHRSD license</option>
              <option value="SAG">MISA license</option>
              <option value="OTH">Other</option>
            </select>
          </label>
          <label>
            Legal identifier
            <input
              value={form.additionalId}
              onChange={(e) => set("additionalId", e.target.value)}
            />
          </label>
        </div>
        <h3 className="form-subtitle">National address</h3>
        <div className="form-grid three">
          <label>
            Street
            <input
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
            />
          </label>
          <label>
            Building number
            <input
              value={form.buildingNumber}
              onChange={(e) => set("buildingNumber", e.target.value)}
            />
          </label>
          <label>
            District
            <input
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
            />
          </label>
          <label>
            City
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </label>
          <label>
            Postal code
            <input
              inputMode="numeric"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
            />
          </label>
          <label>
            Country
            <input value="Saudi Arabia (SA)" readOnly />
          </label>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { QuotationForm } from "@/components/quotation-form";
import { useProduct } from "@/components/product-context";
import { TriangleAlert } from "@/lib/icons";

export default function EditQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useProduct();
  const quotation = data?.quotations.find((item) => item.id === id);

  if (loading)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );

  if (!quotation)
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={30} />
          <h1>Quotation not found</h1>
          <Link className="button secondary" href="/quotations">
            Return to quotations
          </Link>
        </div>
      </div>
    );

  if (quotation.status !== "DRAFT")
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={30} />
          <h1>This quotation is no longer editable</h1>
          <p>Duplicate it to create a new editable commercial document.</p>
          <Link
            className="button secondary"
            href={`/quotations/${quotation.id}`}
          >
            Return to quotation
          </Link>
        </div>
      </div>
    );

  return <QuotationForm initial={quotation} />;
}

"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Pencil,
  ReceiptText,
  Trash2,
  TriangleAlert,
} from "@/lib/icons";
import { StatusPill } from "@/components/app-shell";
import { DocumentRecordRail } from "@/components/document-record-rail";
import { QuotationDraftPreview } from "@/components/document-previews";
import { DocumentActions } from "@/components/document-actions";
import { useProduct } from "@/components/product-context";
import type { InvoiceRecord, QuotationRecord } from "@/lib/product-types";
import type { DocumentKind } from "@/lib/types";
import { riyadhDate } from "@/lib/business-date";

type QuotationTransition = "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, mutate } = useProduct();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quote = data?.quotations.find((item) => item.id === id);
  const recommendedInvoiceKind: DocumentKind = quote?.customer.vatNumber
    ? "STANDARD"
    : "SIMPLIFIED";
  const runAction = async (
    action: "convert" | "duplicate" | "transition",
    options?: { status?: QuotationTransition; kind?: DocumentKind },
  ) => {
    setWorking(true);
    setError(null);
    try {
      const body =
        action === "convert"
          ? { action, kind: options?.kind ?? recommendedInvoiceKind }
          : action === "transition"
            ? { action, status: options?.status }
            : { action };
      const result = await mutate<QuotationRecord | InvoiceRecord>(
        `/api/quotations/${id}`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      if (action === "convert") router.push(`/invoices/${result.id}/edit`);
      if (action === "duplicate") router.push(`/quotations/${result.id}/edit`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setWorking(false);
    }
  };
  const remove = async () => {
    setWorking(true);
    setError(null);
    try {
      await mutate(`/api/quotations/${id}`, { method: "DELETE" });
      router.push("/quotations");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed");
      setConfirmDelete(false);
    } finally {
      setWorking(false);
    }
  };
  if (loading)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  if (!quote)
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h1>Quotation not found</h1>
          <Link className="button secondary" href="/quotations">
            Return to quotations
          </Link>
        </div>
      </div>
    );
  const canConvert =
    ["DRAFT", "SENT", "ACCEPTED"].includes(quote.status) &&
    !quote.convertedInvoiceId;

  return (
    <div className="page document-workspace-page">
      <DocumentRecordRail
        kind="quotation"
        activeId={quote.id}
        records={data?.quotations ?? []}
      />
      <article className="document-workspace-content">
        <div className="detail-top quotation-detail-top">
          <div className="quotation-detail-heading">
            <Link href="/quotations" className="back-link">
              <ArrowLeft size={16} />
              Quotations
            </Link>
            <div className="detail-title">
              <h1>Quotation {quote.number}</h1>
              <StatusPill status={quote.status} />
            </div>
            <p>{quote.customer.name}</p>
          </div>
          <div
            data-help="quotation-actions"
            className="page-actions quotation-action-toolbar"
            role="toolbar"
            aria-label={`Actions for ${quote.number}`}
          >
            <button
              type="button"
              className="button secondary"
              disabled={working}
              onClick={() => void runAction("duplicate")}
            >
              <Copy size={16} />
              Make a copy
            </button>
            <DocumentActions
              kind="Quotation"
              number={quote.number}
              customerName={quote.customer.name}
              customerPhone={quote.customer.phone}
              customerEmail={quote.customer.email}
              total={quote.total}
            />
            {quote.status === "DRAFT" && (
              <button
                type="button"
                className="button secondary"
                disabled={working}
                onClick={() => void runAction("transition", { status: "SENT" })}
              >
                <CheckCircle2 size={16} />
                Record as sent
              </button>
            )}
            {canConvert && (
              <details className="quotation-convert-menu">
                <summary className="button secondary">
                  <ReceiptText size={16} />
                  Convert
                  <ChevronDown size={14} />
                </summary>
                <div className="quotation-convert-menu-content">
                  <div className="quotation-convert-menu-heading">
                    <strong>Create invoice draft</strong>
                    <span>Choose the customer type.</span>
                  </div>
                  <button
                    type="button"
                    className="quotation-convert-option"
                    disabled={working}
                    onClick={() =>
                      void runAction("convert", { kind: "STANDARD" })
                    }
                  >
                    <span>
                      <strong>Business invoice</strong>
                      <small>For a VAT-registered company</small>
                    </span>
                    {recommendedInvoiceKind === "STANDARD" && (
                      <em>Recommended</em>
                    )}
                  </button>
                  <button
                    type="button"
                    className="quotation-convert-option"
                    disabled={working}
                    onClick={() =>
                      void runAction("convert", { kind: "SIMPLIFIED" })
                    }
                  >
                    <span>
                      <strong>Customer invoice</strong>
                      <small>For an individual or walk-in sale</small>
                    </span>
                    {recommendedInvoiceKind === "SIMPLIFIED" && (
                      <em>Recommended</em>
                    )}
                  </button>
                  <p>This opens an editable invoice draft.</p>
                </div>
              </details>
            )}
            {quote.status === "DRAFT" && (
              <Link
                className="button secondary"
                href={`/quotations/${quote.id}/edit`}
              >
                <Pencil size={16} />
                Edit
              </Link>
            )}
            {quote.convertedInvoiceId && (
              <Link
                className="button primary"
                href={`/invoices/${quote.convertedInvoiceId}`}
              >
                <ReceiptText size={16} />
                Open invoice
              </Link>
            )}
            {(quote.status === "DRAFT" || quote.status === "SENT") && (
              <details
                className="detail-actions-menu"
                aria-label={`More actions for ${quote.number}`}
              >
                <summary className="button secondary">More</summary>
                <div
                  className="detail-actions-menu-content"
                  role="group"
                  aria-label="Quotation actions"
                >
                  {quote.status === "SENT" && (
                    <>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction("transition", { status: "ACCEPTED" })
                        }
                      >
                        <CheckCircle2 size={16} />
                        Record as accepted only
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction("transition", { status: "DECLINED" })
                        }
                      >
                        Mark declined
                      </button>
                    </>
                  )}
                  {quote.status === "SENT" &&
                    quote.expiryDate &&
                    quote.expiryDate < riyadhDate() && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction("transition", { status: "EXPIRED" })
                        }
                      >
                        Mark expired
                      </button>
                    )}
                  {quote.status === "DRAFT" && (
                    <button
                      type="button"
                      className="button danger"
                      disabled={working}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={16} />
                      Delete draft
                    </button>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
        {error && (
          <div className="inline-alert error" role="alert">
            <TriangleAlert size={18} />
            {error}
          </div>
        )}
        <div className="document-customer-copy">
          <QuotationDraftPreview
            numberLabel={quote.number}
            seller={data?.organisation ?? quote.customer}
            customer={quote.customer}
            issueDate={quote.issueDate}
            expiryDate={quote.expiryDate}
            taxEnabled={quote.taxEnabled}
            lines={quote.lines}
            notes={quote.notes}
            terms={quote.terms}
          />
        </div>
        <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <Dialog.Content className="review-modal" maxWidth="460px">
            <Dialog.Title>Delete draft quotation?</Dialog.Title>
            <Dialog.Description>
              {quote.number} will be removed. Its allocated number and audit
              event history remain part of the workspace evidence.
            </Dialog.Description>
            <div className="modal-actions">
              <Dialog.Close>
                <button className="button secondary" disabled={working}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="button danger"
                disabled={working}
                onClick={() => void remove()}
              >
                <Trash2 size={16} />
                {working ? "Deleting" : "Delete draft"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </article>
    </div>
  );
}

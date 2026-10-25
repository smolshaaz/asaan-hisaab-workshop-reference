"use client";

import { AmountInput } from "@/components/amount-input";
import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Trash2 } from "@/lib/icons";
import { useProduct } from "./product-context";
import { AttachmentPicker, useAttachmentQueue } from "./attachment-picker";
import { riyadhDate } from "@/lib/business-date";
import { money } from "@/lib/format";
import styles from "./cars.module.css";

type BillLine = { id: string; description: string; amount: string };
const newLine = (): BillLine => ({
  id: crypto.randomUUID(),
  description: "",
  amount: "",
});

type CarBillFormProps = {
  vehicleId: string;
  customerLinked: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

export function CarBillForm(props: CarBillFormProps) {
  return <CarBillFormFields key={props.vehicleId} {...props} />;
}

function CarBillFormFields({
  vehicleId,
  customerLinked,
  onSaved,
  onCancel,
}: CarBillFormProps) {
  const { mutate, refresh } = useProduct();
  const [lines, setLines] = useState<BillLine[]>([newLine()]);
  const [totalOnly, setTotalOnly] = useState(false);
  const [totalOverride, setTotalOverride] = useState("");
  const [date, setDate] = useState(riyadhDate());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [savedBillId, setSavedBillId] = useState<string>();
  const attachments = useAttachmentQueue();
  const requestId = useRef(crypto.randomUUID());
  const saving = useRef(false);
  const total = totalOnly
    ? Number(totalOverride) || 0
    : lines.reduce(
        (sum, line) => sum + Math.round((Number(line.amount) || 0) * 100),
        0,
      ) / 100;
  function move(index: number, offset: number) {
    setLines((current) => {
      const copy = [...current];
      [copy[index], copy[index + offset]] = [copy[index + offset], copy[index]];
      return copy;
    });
  }
  async function save() {
    if (saving.current || attachments.blocked) return;
    const filled = lines.filter(
      (line) => line.description.trim() || line.amount,
    );
    if (!filled.length && !(totalOnly && Number(totalOverride) > 0)) {
      setError("Add what you worked on or its price.");
      return;
    }
    if (totalOnly && !totalOverride) {
      setError("Enter the total price.");
      return;
    }
    saving.current = true;
    setWorking(true);
    setError("");
    let billId = savedBillId;
    const hasFiles = attachments.files.length > 0;
    try {
      if (!billId) {
        const result = await mutate<{ billId: string }>(
          `/api/vehicles/${vehicleId}/bill`,
          {
            method: "POST",
            body: JSON.stringify({
              requestId: requestId.current,
              entryDate: date,
              lines: filled.map((line) => ({
                description: line.description,
                amount: Number(line.amount) || 0,
              })),
              totalOverride: totalOnly ? Number(totalOverride) : undefined,
            }),
          },
        );
        billId = result.billId;
        setSavedBillId(billId);
      }
      await attachments.upload("BILL", billId);
      if (hasFiles) await refresh();
      onSaved();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not save. Your entries are still here.";
      setError(
        billId
          ? `Your customer bill is saved. ${message} Retry to save the remaining files; the amount will not be added again.`
          : message,
      );
      if (billId && hasFiles) await refresh();
    } finally {
      saving.current = false;
      setWorking(false);
    }
  }
  return (
    <form
      className={styles.bill}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div>
        <h2>What we charge the customer</h2>
        <p>
          Enter the agreed selling price for our work and parts. Our purchase
          costs are recorded separately.
        </p>
      </div>
      <p className={styles.notice}>
        {customerLinked
          ? "This adds to the customer’s balance. If this work is already on an invoice, use that invoice instead."
          : "Customer not added. This saves a bill draft with the car. Add the customer later to record what they owe."}
      </p>
      {error && (
        <p className="inline-alert error" role="alert">
          {error}
        </p>
      )}
      {savedBillId && (
        <p className="attachment-recovery" role="status">
          Customer bill saved.{" "}
          <Link className="text-link" href={`/bills/${savedBillId}`}>
            {attachments.files.length
              ? "Open saved bill without the pending files"
              : "Open saved bill"}
          </Link>
        </p>
      )}
      <fieldset
        disabled={working || Boolean(savedBillId)}
        className={styles.fields}
      >
        {lines.map((line, index) => (
          <div className={styles.billLine} key={line.id}>
            <label className={styles.description}>
              Work or part we charge for
              <textarea
                rows={2}
                value={line.description}
                placeholder="For example: replace brake pads"
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item) =>
                      item.id === line.id
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            {!totalOnly && (
              <label>
                Customer price (SAR)
                <AmountInput
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  placeholder="0.00"
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, amount: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            )}
            <div className={styles.lineActions}>
              <button
                type="button"
                className="button secondary"
                aria-label={`Move line ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronDown
                  size={16}
                  style={{ transform: "rotate(180deg)" }}
                />
              </button>
              <button
                type="button"
                className="button secondary"
                aria-label={`Move line ${index + 1} down`}
                disabled={index === lines.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove line ${index + 1}`}
                onClick={() =>
                  setLines((current) =>
                    current.filter((item) => item.id !== line.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => setLines((current) => [...current, newLine()])}
        >
          <Plus size={18} /> Add another line
        </button>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={totalOnly}
            onChange={(event) => setTotalOnly(event.target.checked)}
          />{" "}
          I only know the total price
        </label>
        {totalOnly && (
          <label>
            Total price (SAR)
            <AmountInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={totalOverride}
              onChange={(event) => setTotalOverride(event.target.value)}
              placeholder="0.00"
            />
          </label>
        )}
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
      </fieldset>
      <section aria-label="Bill photo or PDF">
        <h3>Bill photo or PDF</h3>
        <AttachmentPicker queue={attachments} disabled={working} />
      </section>
      <div className={styles.billFooter}>
        <strong>Total {money(total)}</strong>
        <div className={styles.actions}>
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            disabled={working}
          >
            {savedBillId
              ? attachments.files.length
                ? "Keep bill without pending files"
                : "Done"
              : "Cancel"}
          </button>
          <button
            className="button primary"
            disabled={working || attachments.blocked}
          >
            {working
              ? "Saving…"
              : savedBillId
                ? "Retry and finish saving"
                : "Save customer bill"}
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, Plus, X } from "@/lib/icons";
import { useProduct } from "./product-context";
import { money } from "@/lib/format";
import styles from "./saved-record-notice.module.css";
export function SavedRecordNotice() {
  const params = useSearchParams();
  const path = usePathname();
  const { data } = useProduct();
  const [dismissed, setDismissed] = useState("");
  const id = params.get("saved");
  if (!id || dismissed === id) return null;
  const entry = data?.ledger.entries.find((e) => e.id === id);
  if (!entry) return null;
  const personId =
    params.get("savedPerson") || entry.counterpartyId || entry.personId;
  const car = path.startsWith("/cars/") ? path.split("/")[2] : entry.vehicleId;
  const next = new URLSearchParams();
  if (car) next.set("car", car);
  else if (path.startsWith("/people/") && personId)
    next.set("person", personId);
  return (
    <aside
      className={styles.notice}
      aria-label="Saved record"
      data-help="record-saved"
    >
      <div className={styles.message} role="status">
        <Check size={20} />
        <span>
          <strong>Saved</strong> · {money(entry.amount)}
          {entry.personName ? ` · ${entry.personName}` : ""}
        </span>
      </div>
      <nav className={styles.actions} aria-label="After saving">
        <Link href={`/payments/new${next.size ? `?${next}` : ""}`}>
          <Plus size={17} />
          Add another
        </Link>
        <Link href={`/payments#entry-${id}`}>View record</Link>
        {personId && <Link href={`/people/${personId}`}>View balance</Link>}
        <button
          type="button"
          onClick={() => setDismissed(id)}
          aria-label="Dismiss saved message"
        >
          <X size={18} />
        </button>
      </nav>
    </aside>
  );
}

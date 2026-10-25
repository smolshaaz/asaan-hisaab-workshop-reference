"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillRecord } from "@/lib/bill-types";
import { useProduct } from "./product-context";
import styles from "./bills.module.css";

export function BillCarLink({ bill }: { bill: BillRecord }) {
  const { data, mutate } = useProduct();
  const [editing, setEditing] = useState(false);
  const [vehicleId, setVehicleId] = useState(bill.vehicleId || "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <section className={styles.carLink} aria-label="Car linked to this bill">
      <div className={styles.actions}>
        <span>
          Car:{" "}
          {bill.vehicleId ? (
            <Link href={`/cars/${bill.vehicleId}`}>
              {bill.plateNumber || "Open car"}
            </Link>
          ) : (
            "Not linked yet"
          )}
        </span>
        {!editing && bill.status !== "CANCELLED" && (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setVehicleId(bill.vehicleId || "");
              setError("");
              setSaved(false);
              setEditing(true);
            }}
          >
            {bill.vehicleId ? "Change car" : "Link a car"}
          </button>
        )}
      </div>
      {editing && (
        <form
          className={styles.form}
          onSubmit={async (event) => {
            event.preventDefault();
            if (working) return;
            setWorking(true);
            setError("");
            try {
              await mutate("/api/bills", {
                method: "POST",
                body: JSON.stringify({
                  action: "link-vehicle",
                  id: bill.id,
                  vehicleId: vehicleId || null,
                }),
              });
              setEditing(false);
              setSaved(true);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Could not link the car. Try again.",
              );
            } finally {
              setWorking(false);
            }
          }}
        >
          <label>
            Which car was this for?
            <select
              value={vehicleId}
              disabled={working}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Not for a particular car</option>
              {data?.vehicles.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.plateNumber ||
                    car.displayName ||
                    [car.make, car.model].filter(Boolean).join(" ") ||
                    "Car details to add"}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.note}>
            The same bill will appear inside this car. Its amount and payments
            stay the same.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button className="button primary" disabled={working}>
              {working ? "Saving…" : "Save car link"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={working}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {saved && (
        <p className={styles.saved} role="status">
          Car link saved.
        </p>
      )}
    </section>
  );
}

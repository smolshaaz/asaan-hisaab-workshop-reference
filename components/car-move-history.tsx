"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProduct } from "./product-context";
import type { CarMoveRecord } from "@/lib/product-types";
import { shortDate } from "@/lib/format";
import { carWord } from "./put-cars-together";
import styles from "./put-cars-together.module.css";

type Conflict = { vehicleId: string; label: string; customerName?: string };
type Result =
  | { kind: "done" }
  | { kind: "conflict"; cars: Conflict[] }
  | { kind: "error"; message: string };

/**
 * On the chosen customer's car list: the result message after Put cars
 * together, and every change still in place, each with Put back.
 */
export function CarMoveHistory({
  customerId,
  customerName,
  carTotal,
  justMovedId,
}: {
  customerId: string;
  customerName: string;
  carTotal: number;
  justMovedId?: string | null;
}) {
  const { data, refresh, mutate } = useProduct();
  const router = useRouter();
  const [working, setWorking] = useState("");
  const [result, setResult] = useState<Result>();
  const moves = (data?.carMoves || []).filter(
    (move) => move.destinationCustomerId === customerId && !move.putBackAt,
  );
  const justMoved = moves.find((move) => move.id === justMovedId);
  const nameOf = (move: CarMoveRecord, id: string) =>
    data?.customers.find((customer) => customer.id === id)?.name ||
    move.names[id] ||
    "Customer";

  function done() {
    setResult({ kind: "done" });
    if (justMovedId) router.replace(`/cars?customer=${customerId}`);
  }

  async function putBack(move: CarMoveRecord) {
    if (working) return;
    setWorking(move.id);
    setResult(undefined);
    try {
      await mutate<CarMoveRecord>(`/api/car-moves/${move.id}/put-back`, {
        method: "POST",
      });
      await refresh();
      done();
    } catch {
      setResult({
        kind: "error",
        message: "Nothing changed. Check browser storage, then try again.",
      });
    } finally {
      setWorking("");
    }
  }

  const putBackButton = (move: CarMoveRecord) => (
    <button
      type="button"
      className="button secondary"
      disabled={Boolean(working)}
      onClick={() => void putBack(move)}
    >
      {working === move.id ? "Putting back…" : "Put back"}
    </button>
  );

  return (
    <>
      {result?.kind === "done" && (
        <p className="inline-alert" role="status">
          Cars are back under their old names.
        </p>
      )}
      {result?.kind === "conflict" && (
        <div className={`inline-alert error ${styles.conflict}`} role="alert">
          <p>Some cars were moved again. Open them to change the customer.</p>
          <ul>
            {result.cars.map((car) => (
              <li key={car.vehicleId}>
                <Link href={`/cars/${car.vehicleId}`}>{car.label}</Link>
                {car.customerName ? ` · now under ${car.customerName}` : ""}
              </li>
            ))}
          </ul>
          <p>Nothing changed.</p>
        </div>
      )}
      {result?.kind === "error" && (
        <p className="inline-alert error" role="alert">
          {result.message}
        </p>
      )}
      {justMoved && (
        <div className={styles.banner} role="status">
          <strong>
            {carWord(carTotal)} {carTotal === 1 ? "is" : "are"} now under{" "}
            {customerName}.
          </strong>
          {putBackButton(justMoved)}
        </div>
      )}
      {moves.length > 0 && (
        <section className={styles.history} aria-label="Cars put together here">
          <h3>Cars put together here</h3>
          <ul>
            {moves.map((move) => (
              <li key={move.id}>
                <span>
                  <strong>
                    From{" "}
                    {move.sourceCustomerIds
                      .map((id) => nameOf(move, id))
                      .join(", ")}
                  </strong>
                  <small>
                    {shortDate(move.createdAt)} · {carWord(move.cars.length)}{" "}
                    moved here
                  </small>
                </span>
                {putBackButton(move)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

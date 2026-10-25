"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  ChevronDown,
  ArrowRight,
} from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { LedgerHistory, type HistoryFilter } from "@/components/ledger-history";
import { PersonDocuments } from "@/components/person-documents";
import { PersonQuickEdit } from "@/components/person-quick-edit";
import carStyles from "@/components/cars.module.css";
import { carCustomerAliases, resolveCarCustomer } from "@/lib/car-moves";
import { personAccount } from "@/lib/account-summary";
import { recordedBalanceText } from "@/lib/ledger-display";
import { initials, money } from "@/lib/format";
import styles from "@/components/person-balance.module.css";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useProduct();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [revealRequest, setRevealRequest] = useState(0);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const person = data?.ledger.people.find((item) => item.id === id);
  if (loading) return <div className="page daily-page">Loading person…</div>;
  if (!person || !data)
    return (
      <div className="page daily-page">
        <Link className="back-link" href="/people">
          <ArrowLeft aria-hidden="true" /> Back to people
        </Link>
        <h1>Person not found</h1>
      </div>
    );
  const account = personAccount(data, person);
  const ownCars = person.customerId
    ? data.vehicles.filter((car) => car.customerId === person.customerId)
    : [];
  const aliases = carCustomerAliases(data.carMoves);
  const carsMovedTo =
    person.customerId && aliases.has(person.customerId)
      ? data.customers.find(
          (customer) =>
            customer.id === resolveCarCustomer(person.customerId!, aliases),
        )
      : undefined;
  const broughtCars = data.vehicles.filter(
    (car) =>
      car.representativePersonId === person.id &&
      car.customerId !== person.customerId,
  );
  const entries = account.entries;
  const unchecked = account.pending;
  const uncheckedAmount = account.pendingAmount;
  const action = (kind: string) => `/payments/new?person=${id}&kind=${kind}`;
  function showHistory(next: HistoryFilter) {
    setFilter(next);
    setRevealRequest((value) => value + 1);
    requestAnimationFrame(() => {
      historyHeading.current?.focus({ preventScroll: true });
      historyHeading.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
  }
  return (
    <div className="page daily-page">
      <Link href="/people" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" /> People
      </Link>
      <div className="person-header">
        <span className="person-avatar large" aria-hidden="true">
          {initials(person.name)}
        </span>
        <div>
          <h1>{person.name}</h1>
          <p>
            {person.phone ||
              person.roles.map((role) => role.toLowerCase()).join(" · ")}
          </p>
          <div className={carStyles.personActions}>
            <PersonQuickEdit person={person} />
          </div>
        </div>
      </div>
      {(ownCars.length > 0 || broughtCars.length > 0 || carsMovedTo) && (
        <section className={carStyles.personCars} aria-label="Cars">
          {carsMovedTo && (
            <p className={carStyles.movedNote}>
              Cars are under{" "}
              <Link href={`/cars?customer=${carsMovedTo.id}`}>
                {carsMovedTo.name}
              </Link>
              .
            </p>
          )}
          {ownCars.length > 0 && (
            <div>
              <h2>
                Their cars{" "}
                <Link href={`/cars?customer=${person.customerId}`}>
                  Open in Cars
                </Link>
              </h2>
              <div className={carStyles.carChips}>
                {ownCars.map((car) => (
                  <Link key={car.id} href={`/cars/${car.id}`}>
                    {car.plateNumber || car.displayName || "Car"}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {broughtCars.length > 0 && (
            <div>
              <h2>Cars they brought</h2>
              <div className={carStyles.carChips}>
                {broughtCars.map((car) => (
                  <Link key={car.id} href={`/cars/${car.id}`}>
                    {car.plateNumber || car.displayName || "Car"}
                    {car.customerName ? ` · ${car.customerName}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      <section data-help="person-balance" className={styles.account}>
        <h2>One account for {person.name}</h2>
        <p className={styles.scope}>
          Customer work, supplier bills, advances and other saved records,
          counted once.
        </p>
        <div className={styles.totals}>
          <div className={styles.incoming}>
            <span>They owe us</span>
            <strong>{money(account.theyOwe)}</strong>
            <small>Open amounts to receive</small>
          </div>
          <div className={account.weOwe ? styles.outgoing : styles.incoming}>
            <span>We owe them / their credit</span>
            <strong>{money(account.weOwe)}</strong>
            <small>Open amounts to pay or apply</small>
          </div>
        </div>
        {!account.theyOwe && !account.weOwe && (
          <p className={styles.settled}>
            Settled — no open amounts in the linked records.
          </p>
        )}
        <button
          type="button"
          className={styles.comparison}
          aria-expanded={breakdownOpen}
          aria-controls="person-balance-breakdown"
          onClick={() => setBreakdownOpen(!breakdownOpen)}
        >
          <span>
            <strong>Difference: {money(Math.abs(account.net))}</strong>
            <small>
              {account.net > 0
                ? "In the workshop’s favour"
                : account.net < 0
                  ? "In their favour"
                  : "Equal amounts both ways"}{" "}
              · Comparing amounts does not settle a bill.
            </small>
          </span>
          <ChevronDown size={20} aria-hidden="true" />
        </button>
        {unchecked.length > 0 && (
          <button
            type="button"
            className={styles.checkButton}
            onClick={() => showHistory("review")}
            aria-controls="person-history"
          >
            <span>
              <strong>
                {unchecked.length} expense{unchecked.length === 1 ? "" : "s"}{" "}
                still to check · {money(uncheckedAmount)}
              </strong>
              <small>
                Included above. Without these claims:{" "}
                {recordedBalanceText(account.confirmedNet)}. Open the receipts
                before deciding what to hand over.
              </small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        )}
        {breakdownOpen && (
          <div className={styles.breakdown} id="person-balance-breakdown">
            <dl>
              <div>
                <dt>Money-book balance</dt>
                <dd>{recordedBalanceText(person.balance)}</dd>
              </div>
              <div>
                <dt>Of that, open bill balances</dt>
                <dd>{recordedBalanceText(account.billBalance)}</dd>
              </div>
              <div>
                <dt>Other money-book balance</dt>
                <dd>{recordedBalanceText(account.otherBalance)}</dd>
              </div>
              <div>
                <dt>Generated invoices and credits</dt>
                <dd>{recordedBalanceText(account.invoiceBalance)}</dd>
              </div>
            </dl>
            <p>
              Open bill balances are already in the money book. We remove them
              from “Other money-book balance” before showing the bills
              separately. That remainder includes advances, unmatched payments
              and earlier debts.
            </p>
            <p>
              This is an account comparison, not money counted in the worker’s
              hand or the workshop’s drawer. The bills stay open until their
              payments or agreed settlements are recorded.
            </p>
          </div>
        )}
        {account.items.length > 0 && (
          <div className={styles.sources} data-help="person-account-records">
            <h3>Records behind these amounts</h3>
            {account.items.map((item) => (
              <Link
                className={styles.sourceRow}
                key={`${item.source}:${item.id}`}
                href={item.href}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.explanation}</small>
                </span>
                <span data-tone={item.balance > 0 ? "in" : "out"}>
                  <strong>{money(Math.abs(item.balance))}</strong>
                  <small>
                    {item.balance > 0 ? "They owe us" : "We owe / credit"}
                  </small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
        {!person.customerId && (
          <p className={styles.scope}>
            Invoices under a separate customer record are not included until you{" "}
            <a href="#person-customer-invoices">link the same person below</a>.
          </p>
        )}
      </section>
      <div className="person-quick-actions">
        <Link href={action("GIVE_MONEY")}>
          <ArrowUpRight size={23} aria-hidden="true" />
          <span>We gave money</span>
        </Link>
        <Link href={action("RECEIVE_MONEY")}>
          <ArrowDownRight size={23} aria-hidden="true" />
          <span>They gave money</span>
        </Link>
        <Link href={action("PERSON_SPENT")}>
          <Plus size={23} aria-hidden="true" />
          <span>They spent for us</span>
        </Link>
        <Link href={action("PERSON_COLLECTED")}>
          <Plus size={23} aria-hidden="true" />
          <span>They collected for us</span>
        </Link>
      </div>
      <section data-help="person-history" aria-labelledby="person-history">
        <div className="section-title">
          <h2
            id="person-history"
            className={styles.historyHeading}
            ref={historyHeading}
            tabIndex={-1}
          >
            Money-book records
          </h2>
          <Link className="text-link" href={action("OPENING_WE_OWE")}>
            Add an old balance
          </Link>
        </div>
        <div
          className={styles.filters}
          role="group"
          aria-label="Which records to show"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => {
              setFilter("all");
              setRevealRequest((value) => value + 1);
            }}
          >
            All records ({entries.length})
          </button>
          <button
            type="button"
            aria-pressed={filter === "review"}
            onClick={() => {
              setFilter("review");
              setRevealRequest((value) => value + 1);
            }}
          >
            Expenses to check ({unchecked.length})
          </button>
        </div>
        <p className={styles.historyNote}>
          {filter === "review"
            ? "Open each expense to check its note and receipt, then mark it checked."
            : "Newest records first. Open any row for its full details and receipts."}
        </p>
        {entries.some(
          (entry) =>
            entry.payerPersonId === person.id &&
            entry.personId !== person.id &&
            entry.counterpartyId !== person.id,
        ) && (
          <p className={styles.historyNote}>
            Payments they made for another customer are shown as evidence. Those
            payments settle that customer’s bill; they do not create an amount
            owed to this payer.
          </p>
        )}
        <LedgerHistory
          entries={entries}
          personId={id}
          filter={filter}
          revealRequest={revealRequest}
        />
      </section>
      <PersonDocuments person={person} />
    </div>
  );
}

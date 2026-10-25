"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Car,
  Pencil,
  Plus,
  ReceiptText,
  TriangleAlert,
} from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { CarBillForm } from "@/components/car-bill-form";
import { CustomerQuickEdit } from "@/components/customer-quick-create";
import { PersonQuickEdit } from "@/components/person-quick-edit";
import { CarForm, CARS_RETURN_KEY } from "@/components/car-form";
import { LedgerHistory } from "@/components/ledger-history";
import { RecordAttachments } from "@/components/ledger-attachments";
import { money, shortDate } from "@/lib/format";
import { fiscalSign } from "@/lib/calculations";
import {
  canReceiveInvoicePayment,
  isCollectableInvoiceStatus,
} from "@/lib/invoice-payment-eligibility";
import { carCostStory } from "@/lib/car-costs";
import styles from "@/components/cars.module.css";

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refresh, mutate } = useProduct();
  const [showBill, setShowBill] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customerFirst, setCustomerFirst] = useState(false);
  const [notice, setNotice] = useState("");
  const [linkingBill, setLinkingBill] = useState(false);
  const [savedBillId, setSavedBillId] = useState("");
  const [linkWorking, setLinkWorking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [showSpending, setShowSpending] = useState(false);
  const [backHref, setBackHref] = useState("/cars");
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CARS_RETURN_KEY);
      if (stored?.startsWith("/cars")) setBackHref(stored);
    } catch {}
  }, []);
  if (loading)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  if (error || !data)
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h1>Car could not load</h1>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      </div>
    );
  const car = data.vehicles.find((item) => item.id === id);
  if (!car)
    return (
      <div className="page">
        <div className="state-page error-state">
          <Car size={28} />
          <h1>Car not found</h1>
          <Link className="button secondary" href="/cars">
            Back to cars
          </Link>
        </div>
      </div>
    );
  const customer = data.customers.find((item) => item.id === car.customerId);
  const person = car.customerId
    ? data.ledger.people.find((item) => item.customerId === car.customerId)
    : undefined;
  const broughtBy = car.representativePersonId
    ? data.ledger.people.find((item) => item.id === car.representativePersonId)
    : undefined;
  const customerCarCount = car.customerId
    ? data.vehicles.filter((item) => item.customerId === car.customerId).length
    : 0;
  const entries = data.ledger.entries.filter(
    (entry) => entry.vehicleId === car.id,
  );
  const invoices = data.invoices.filter(
    (invoice) => invoice.vehicleId === car.id,
  );
  const quotations = data.quotations.filter(
    (quote) => quote.vehicleId === car.id,
  );
  const billRecords = data.billBook.bills.filter(
    (bill) => bill.vehicleId === car.id,
  );
  const supplierBills = billRecords.filter(
    (bill) => bill.direction === "PURCHASE",
  );
  const openSupplierBills = supplierBills.filter(
    (bill) =>
      bill.status === "DRAFT" || (bill.status === "POSTED" && bill.balance > 0),
  );
  const hasSupplierBills = supplierBills.some(
    (bill) => bill.status !== "CANCELLED",
  );
  const customerBills = billRecords.filter((bill) => bill.direction === "SALE");
  const unlinkedSupplierBills = data.billBook.bills.filter(
    (bill) =>
      bill.direction === "PURCHASE" &&
      !bill.vehicleId &&
      bill.status !== "CANCELLED",
  );
  async function linkSavedBill(event: React.FormEvent) {
    event.preventDefault();
    if (!savedBillId || linkWorking) return;
    setLinkWorking(true);
    setLinkError("");
    try {
      await mutate("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          action: "link-vehicle",
          id: savedBillId,
          vehicleId: car!.id,
        }),
      });
      setLinkingBill(false);
      setSavedBillId("");
      setNotice(
        "Supplier bill linked to this car. No expense or payment was added again.",
      );
    } catch (reason) {
      setLinkError(
        reason instanceof Error
          ? reason.message
          : "Could not link the bill. Try again.",
      );
    } finally {
      setLinkWorking(false);
    }
  }
  const managedChargeIds = new Set(
    billRecords.map((bill) => bill.chargeEntryId).filter(Boolean),
  );
  const managedSettlementIds = new Set(
    data.billBook.settlements
      .filter((settlement) =>
        billRecords.some(
          (bill) =>
            bill.id === settlement.billId || bill.id === settlement.otherBillId,
        ),
      )
      .map((settlement) => settlement.ledgerEntryId),
  );
  const unmanagedEntries = entries.filter(
    (entry) =>
      !managedChargeIds.has(entry.id) &&
      !managedChargeIds.has(entry.reversalOf) &&
      !managedSettlementIds.has(entry.id),
  );
  const activeSaleBills = billRecords.filter(
    (bill) => bill.direction === "SALE" && bill.status === "POSTED",
  );
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const previous = data.ledger.legacyEntries.filter(
    (entry) =>
      entry.vehicleId === car.id ||
      (entry.invoiceId && invoiceIds.has(entry.invoiceId)),
  );
  const oldMoney = data.moneyEntries.filter(
    (entry) => entry.vehicleId === car.id,
  );
  // Earlier money saves also created matching job rows. They are one event,
  // so those generated rows must not become a second customer charge.
  const jobs = data.workshopJobs.filter(
    (job) =>
      job.vehicleId === car.id &&
      !oldMoney.some(
        (entry) =>
          entry.createdAt === job.createdAt &&
          ((entry.category === "EARNED_FROM_CAR" &&
            entry.amount === job.amountCharged) ||
            (entry.category === "SPENT_ON_CAR" &&
              entry.amount === job.costAmount)),
      ),
  );
  const sum = (values: number[]) =>
    values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
  const story = carCostStory({
    vehicleId: car.id,
    entries: data.ledger.entries,
    people: data.ledger.people,
    previous,
    jobs,
    oldMoney,
    invoices: data.invoices,
    payments: data.payments,
    billBook: data.billBook,
    creditUses: data.ledger.creditUses,
  });
  const { cashIn, cashOut } = story;
  const oldBillTotal = sum(
    oldMoney
      .filter(
        (entry) =>
          entry.category === "RANDOM_NOTE" &&
          entry.description.startsWith("[BILL]"),
      )
      .map((entry) => entry.amount),
  );
  const earlierCharges = sum([
    oldBillTotal,
    ...jobs.map((job) => job.amountCharged),
  ]);
  const ledgerCharges = sum(
    entries
      .filter((entry) => entry.kind === "CREDIT_SALE")
      .map((entry) => entry.income),
  );
  const earlierPayments = sum([
    ...oldMoney
      .filter(
        (entry) =>
          ["EARNED_FROM_CAR", "CUSTOMER_PAYMENT"].includes(entry.category) &&
          !entry.invoiceId,
      )
      .map((entry) => entry.amount),
    ...entries
      .filter((entry) => entry.kind === "INCOME")
      .map((entry) => entry.cashIn),
  ]);
  // A payment matched to a registered bill already reduces that bill's balance.
  // Only its unallocated remainder can also settle earlier car charges. Undo
  // rows have negative amounts, so they release the payment automatically.
  const allocatedPaymentCents = new Map<string, number>();
  for (const settlement of data.billBook.settlements) {
    if (settlement.kind === "PAYMENT" && settlement.existingEntryId) {
      allocatedPaymentCents.set(
        settlement.existingEntryId,
        (allocatedPaymentCents.get(settlement.existingEntryId) || 0) +
          Math.round(settlement.amount * 100),
      );
    }
  }
  for (const payment of data.payments) {
    if (payment.sourceEntryId)
      allocatedPaymentCents.set(
        payment.sourceEntryId,
        (allocatedPaymentCents.get(payment.sourceEntryId) || 0) +
          Math.round(payment.amount * 100),
      );
  }
  // A car can change owners. The person on each saved charge remains its
  // debtor, regardless of the car's current customer or their other balances.
  const billDebtors = [
    ...new Set(
      unmanagedEntries
        .filter((entry) => entry.kind === "CREDIT_SALE" && entry.personId)
        .map((entry) => entry.personId!),
    ),
  ].map((personId) => {
    const charged = sum(
      unmanagedEntries
        .filter(
          (entry) =>
            entry.kind === "CREDIT_SALE" && entry.personId === personId,
        )
        .map((entry) => entry.personBalanceChange),
    );
    const paid = sum([
      ...unmanagedEntries
        .filter(
          (entry) =>
            entry.kind === "RECEIVE_MONEY" && entry.personId === personId,
        )
        .map((entry) =>
          sum([
            -entry.personBalanceChange,
            -(allocatedPaymentCents.get(entry.id) || 0) / 100,
          ]),
        ),
      ...unmanagedEntries
        .filter(
          (entry) =>
            entry.kind === "PERSON_COLLECTED" &&
            entry.counterpartyId === personId,
        )
        .map((entry) =>
          sum([
            -entry.counterpartyBalanceChange,
            -(allocatedPaymentCents.get(entry.id) || 0) / 100,
          ]),
        ),
    ]);
    return {
      personId,
      charged,
      paid,
      due: Math.max(0, sum([charged, -paid])),
      name:
        data.ledger.people.find((item) => item.id === personId)?.name ||
        "Recorded customer",
    };
  });
  const posted = invoices.filter(isCollectableInvoiceStatus);
  const invoiceDue = sum(
    posted.map(
      (invoice) =>
        fiscalSign(invoice.documentType) *
        (invoice.total - invoice.paidAmount - invoice.badDebtAmount),
    ),
  );
  const ledgerBillDue = sum([
    ...billDebtors.map((debtor) => debtor.due),
    ...activeSaleBills.map((bill) => bill.balance),
  ]);
  const earlierBillDue = Math.max(0, sum([earlierCharges, -earlierPayments]));
  const billDue = sum([earlierBillDue, ledgerBillDue]);
  const due = Math.max(0, sum([billDue, invoiceDue]));
  const paidWork = sum(
    entries
      .filter((entry) => entry.kind !== "CREDIT_SALE")
      .map((entry) => entry.income),
  );
  const oldPaidWork = sum(previous.map((entry) => entry.income));
  const charged = sum([
    ledgerCharges,
    Math.max(earlierCharges, oldPaidWork),
    paidWork,
    story.invoiceCharged,
  ]);
  const customerPaid = story.customerPaid;
  const offsets = sum([
    ...activeSaleBills.map((bill) => bill.offsetAmount),
    story.invoiceOffsets,
  ]);
  const jobDifference = sum([charged, -story.directCosts]);
  const receiptLink = (personId?: string) =>
    `/payments/new?${new URLSearchParams({
      car: car.id,
      direction: "IN",
      ...(personId ? { kind: "RECEIVE_MONEY" } : {}),
      ...(personId ? { person: personId } : {}),
    })}`;
  const receiptOptions = [
    ...activeSaleBills
      .filter((bill) => bill.balance > 0)
      .map((bill) => ({
        id: bill.id,
        label: `${bill.number || "Car bill"} · ${bill.personName}`,
        amount: bill.balance,
        href: `/payments/new?direction=IN&bill=${bill.id}&step=amount`,
      })),
    ...billDebtors
      .filter((debtor) => debtor.due > 0)
      .map((debtor) => ({
        id: `bill-${debtor.personId}`,
        label: `Car bill · ${debtor.name}`,
        amount: debtor.due,
        href: receiptLink(debtor.personId),
      })),
    ...posted.filter(canReceiveInvoicePayment).map((invoice) => ({
      id: invoice.id,
      label: `Invoice ${invoice.number} · ${invoice.customer.name}`,
      amount: sum([invoice.total, -invoice.paidAmount, -invoice.badDebtAmount]),
      href: `/payments/new?direction=IN&invoice=${invoice.id}&step=amount`,
    })),
    ...(earlierBillDue > 0
      ? [
          {
            id: "earlier-bills",
            label: "Earlier car bills",
            amount: earlierBillDue,
            href: receiptLink(),
          },
        ]
      : []),
  ];
  const receiptHref =
    receiptOptions.length === 1
      ? receiptOptions[0].href
      : receiptOptions.length > 1
        ? "#receive-payment"
        : receiptLink();
  const documentParams = new URLSearchParams({ car: car.id });
  if (car.customerId) documentParams.set("customer", car.customerId);
  return (
    <div className="page">
      <Link href={backHref} className="back-link">
        <ArrowLeft size={18} /> Back to cars
      </Link>
      <div className={styles.header}>
        <div>
          <h1>{car.plateNumber || car.displayName || "Car"}</h1>
          <p>
            {[car.make, car.model, car.year, car.color]
              .filter(Boolean)
              .join(" ") || "No details yet"}
          </p>
          {car.vin && <p>Chassis number: {car.vin}</p>}
          <p>
            Customer:{" "}
            {person ? (
              <Link href={`/people/${person.id}`}>{car.customerName}</Link>
            ) : (
              car.customerName || "No customer yet"
            )}
            {car.customerPhone ? ` · ${car.customerPhone}` : ""}
          </p>
          {car.representativeName && (
            <p className={styles.carContact}>
              Brought by:{" "}
              {car.representativePersonId ? (
                <Link href={`/people/${car.representativePersonId}`}>
                  {car.representativeName}
                </Link>
              ) : (
                car.representativeName
              )}
              {car.representativePhone ? ` · ${car.representativePhone}` : ""}
            </p>
          )}
          {car.customerId && (
            <p className={styles.carContact}>
              <Link href={`/cars?customer=${car.customerId}`}>
                All cars of {car.customerName || "this customer"}
              </Link>
            </p>
          )}
          <div data-help="car-edit" className={styles.actions}>
            <button
              type="button"
              className={`button secondary ${styles.editCar}`}
              onClick={() => {
                setCustomerFirst(false);
                setEditing(true);
              }}
            >
              <Pencil size={17} /> Edit car
            </button>
            {customer ? (
              <CustomerQuickEdit
                customer={customer}
                confirm={`This changes ${customer.name} everywhere: on ${
                  customerCarCount === 1
                    ? "this car"
                    : `all ${customerCarCount} of their cars`
                } and their records, not only here.`}
                onUpdated={() => setNotice("Customer details saved.")}
              />
            ) : (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setCustomerFirst(true);
                  setEditing(true);
                }}
              >
                Add customer
              </button>
            )}
            {broughtBy && broughtBy.customerId !== car.customerId && (
              <PersonQuickEdit
                person={broughtBy}
                label={`Edit ${broughtBy.name}`}
                confirm={`This changes ${broughtBy.name} everywhere they appear, not only on this car.`}
                onUpdated={() => setNotice("Details saved.")}
              />
            )}
          </div>
        </div>
        <div data-help="car-money-actions" className={styles.actions}>
          <Link className="button primary received-action" href={receiptHref}>
            Money received
          </Link>
          {hasSupplierBills ? (
            <button
              type="button"
              className={`button secondary ${styles.costAction}`}
              aria-expanded={showSpending}
              aria-controls="supplier-payment"
              onClick={() => setShowSpending((value) => !value)}
            >
              Add cost / payment
            </button>
          ) : (
            <Link
              className={`button secondary ${styles.costAction}`}
              href={`/payments/new?direction=OUT&car=${car.id}`}
            >
              Add cost / payment
            </Link>
          )}
          <button
            data-help="car-bill"
            className="button secondary"
            onClick={() => {
              setShowBill((value) => !value);
              setSaved(false);
            }}
          >
            <Plus size={18} /> Charge customer
          </button>
          <Link
            className="button secondary"
            href={`/bills/new?direction=PURCHASE&car=${car.id}`}
          >
            <Plus size={18} /> Save supplier bill
          </Link>
        </div>
      </div>
      {editing && (
        <CarForm
          car={car}
          focus={customerFirst ? "customer" : "number"}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setNotice("Car details saved.");
          }}
        />
      )}
      {notice && (
        <p className="inline-alert" role="status">
          {notice}
        </p>
      )}
      {car.notes && <p className={styles.notice}>{car.notes}</p>}
      {saved && (
        <p className="inline-alert" role="status">
          Customer bill saved. Open its record below to see the details.
        </p>
      )}
      {showSpending && hasSupplierBills && (
        <section id="supplier-payment" className={styles.section}>
          <h2>New cost, or paying a cost already saved?</h2>
          <p>
            Open a saved bill to record its payment. For a new purchase or
            worker cost, choose Record a different cost.
          </p>
          {openSupplierBills.length ? (
            <div className={styles.history}>
              {openSupplierBills.map((bill) => (
                <article key={bill.id}>
                  <div>
                    <strong>
                      {bill.personName || "Supplier to add"} ·{" "}
                      {bill.number || "Bill without number"}
                    </strong>
                    <p>
                      {bill.status === "DRAFT"
                        ? `${money(bill.total)} · Finish this draft before adding its payment`
                        : `${money(bill.balance)} left to pay`}
                    </p>
                  </div>
                  <Link
                    className={`button primary ${bill.status === "DRAFT" ? "" : styles.costAction}`}
                    href={
                      bill.status === "DRAFT"
                        ? `/bills/${bill.id}`
                        : `/payments/new?direction=OUT&bill=${bill.id}&step=amount`
                    }
                  >
                    {bill.status === "DRAFT"
                      ? "Finish draft"
                      : "Record payment"}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p>The supplier bills saved on this car are already settled.</p>
          )}
          <div className={styles.actions}>
            <Link
              className={`button secondary ${styles.costAction}`}
              href={`/payments/new?direction=OUT&car=${car.id}`}
            >
              Record a different cost
            </Link>
            <a
              className="button secondary"
              href="#supplier-bills"
              onClick={() => {
                setLinkingBill(true);
                setLinkError("");
              }}
            >
              Link a saved supplier bill
            </a>
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowSpending(false)}
            >
              Close
            </button>
          </div>
          <p className={styles.notice}>
            Choose a different expense only when it is not already on a saved
            bill.
          </p>
        </section>
      )}
      <section
        data-help="car-cost-summary"
        className={styles.costStory}
        aria-label="This car's work and costs"
      >
        <div className={styles.costStoryHeading}>
          <h2>This car's work and costs</h2>
          <a href="#car-costs">See every cost</a>
        </div>
        <div className={styles.jobEquation}>
          <div data-money-tone="in">
            <span>Charged to customer</span>
            <strong>{money(charged)}</strong>
          </div>
          <span className={styles.equationSign} aria-hidden="true">
            −
          </span>
          <div data-money-tone="out">
            <span>Direct car costs</span>
            <strong>{money(story.directCosts)}</strong>
            <small>Paid, unpaid and paid by workers</small>
          </div>
          <span className={styles.equationSign} aria-hidden="true">
            =
          </span>
          <div
            className={styles.jobResult}
            data-money-tone={jobDifference < 0 ? "out" : "in"}
          >
            <span>Charge less car costs</span>
            <strong>{money(jobDifference)}</strong>
            <small>Before shared workshop costs</small>
          </div>
        </div>
        <p className={styles.storyNote}>
          Only costs linked to this car are included. Shared rent, utilities and
          personal spending are excluded; recorded totals may include tax. This
          is not the workshop's profit.
        </p>
        <dl className={styles.moneyFacts}>
          <div data-money-tone="in">
            <dt>Paid toward this car</dt>
            <dd>{money(customerPaid)}</dd>
            <small>
              Includes other payers and worker collections; after corrections
            </small>
          </div>
          <div data-money-tone="in">
            <dt>Received by workshop</dt>
            <dd>{money(cashIn)}</dd>
            <small>Includes later handovers and advances</small>
          </div>
          <div data-money-tone="in">
            <dt>Still to collect</dt>
            <dd>{money(due)}</dd>
            <small>Saved customer bills and issued invoices</small>
          </div>
          <div data-money-tone="out">
            <dt>Supplier costs still owed</dt>
            <dd>{money(story.costsOwed)}</dd>
            <small>Parts and work bought on credit</small>
          </div>
        </dl>
        {(story.uncheckedCosts > 0 ||
          story.uncheckedPayments > 0 ||
          offsets > 0) && (
          <p className={styles.storyNote}>
            {story.uncheckedCosts > 0 && (
              <span>
                {money(story.uncheckedCosts)} of costs still need checking.{" "}
              </span>
            )}
            {story.uncheckedPayments > 0 && (
              <span>
                {money(story.uncheckedPayments)} of payments reported by workers
                still need checking.{" "}
              </span>
            )}
            {offsets > 0 && (
              <span>
                {money(offsets)} settled against another bill, without receiving
                money.
              </span>
            )}
          </p>
        )}
        <details className={styles.cashDetails}>
          <summary>Money that reached or left the workshop</summary>
          <dl className={styles.moneyFacts}>
            <div data-money-tone="in">
              <dt>Received by workshop</dt>
              <dd>{money(cashIn)}</dd>
            </div>
            <div data-money-tone="out">
              <dt>Paid by workshop</dt>
              <dd>{money(cashOut)}</dd>
            </div>
            <div>
              <dt>Cash movement difference</dt>
              <dd>{money(sum([cashIn, -cashOut]))}</dd>
            </div>
          </dl>
          <p>
            Worker-held money and unpaid costs do not move workshop cash. This
            difference is not a counted cash balance or profit.
          </p>
        </details>
      </section>
      {receiptOptions.length > 1 && (
        <section id="receive-payment" className={styles.section}>
          <h2>Which customer charge is being paid?</h2>
          <p>Choose the bill or invoice so the right balance is updated.</p>
          <div className={styles.history}>
            {receiptOptions.map((option) => (
              <article key={option.id}>
                <div>
                  <strong>{option.label}</strong>
                  <p>Still owed: {money(option.amount)}</p>
                </div>
                <Link className="button primary" href={option.href}>
                  Record payment
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
      {charged === 0 && (
        <p className={styles.notice}>
          No work price has been recorded yet. Choose Charge customer to record
          the agreed amount.
        </p>
      )}
      {oldBillTotal > 0 && (
        <p className={styles.notice}>
          Older car bills total {money(oldBillTotal)}. They are included here,
          but were not added to People balances.
        </p>
      )}
      {showBill && (
        <CarBillForm
          key={car.id}
          vehicleId={car.id}
          customerLinked={Boolean(car.customerId)}
          onSaved={() => {
            setShowBill(false);
            setSaved(true);
          }}
          onCancel={() => setShowBill(false)}
        />
      )}
      <section data-help="car-documents" className={styles.section}>
        <div className={styles.header}>
          <h2>What we charge the customer</h2>
          <div className={styles.actions}>
            <Link
              className="button secondary"
              href={`/invoices/new?${documentParams}`}
            >
              <ReceiptText size={17} /> New invoice
            </Link>
            <Link
              className="button secondary"
              href={`/quotations/new?${documentParams}`}
            >
              New quotation
            </Link>
          </div>
        </div>
        <p>
          A customer bill or invoice records our agreed price. Choose one for
          the same work, then open it when the customer pays.
        </p>
        {invoices.length || quotations.length || customerBills.length ? (
          <div className={styles.history}>
            {customerBills.map((bill) => (
              <article key={bill.id}>
                <div>
                  <Link href={`/bills/${bill.id}`}>
                    <strong>{bill.number || "Bill draft"}</strong>
                  </Link>
                  <p>Customer bill · {bill.status.toLowerCase()}</p>
                </div>
                <div className={styles.actions}>
                  <strong>
                    {bill.status === "POSTED"
                      ? `${money(bill.balance)} left`
                      : money(bill.total)}
                  </strong>
                  {bill.status === "DRAFT" && (
                    <Link
                      className="button secondary"
                      href={`/bills/${bill.id}`}
                    >
                      Finish draft
                    </Link>
                  )}
                </div>
              </article>
            ))}
            {invoices.map((invoice) => (
              <article key={invoice.id}>
                <div>
                  <Link href={`/invoices/${invoice.id}`}>
                    <strong>{invoice.number}</strong>
                  </Link>
                  <p>
                    {invoice.status === "DRAFT"
                      ? "Draft — finish when ready"
                      : invoice.status.replaceAll("_", " ").toLowerCase()}
                  </p>
                </div>
                <strong>{money(invoice.total)}</strong>
              </article>
            ))}
            {quotations.map((quote) => (
              <article key={quote.id}>
                <div>
                  <Link href={`/quotations/${quote.id}`}>
                    <strong>{quote.number}</strong>
                  </Link>
                  <p>Quotation · {quote.status.toLowerCase()}</p>
                </div>
                <strong>{money(quote.total)}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p>No customer documents for this car yet.</p>
        )}
      </section>
      <section
        id="supplier-bills"
        data-help="car-supplier-bills"
        className={styles.section}
      >
        <div className={styles.header}>
          <div>
            <h2>Supplier bills — evidence of our costs</h2>
            <p>
              What we bought for this car, separate from what we charge the
              customer.
            </p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setLinkingBill((value) => !value);
              setLinkError("");
            }}
          >
            Link a saved supplier bill
          </button>
        </div>
        <p className={styles.notice}>
          Save a new purchase once, or link its existing bill. A photo or a
          linked bill adds evidence; it must not create a second expense. Open a
          saved bill to pay it.
        </p>
        <p>
          Already recorded a paid cost or worker expense? Add the supplier's
          receipt to that money record below. Do not record the purchase again.
        </p>
        {linkingBill && (
          <form
            className={`${styles.bill} ${styles.addForm}`}
            onSubmit={linkSavedBill}
          >
            {unlinkedSupplierBills.length ? (
              <>
                <label>
                  Which saved supplier bill belongs to this car?
                  <select
                    required
                    value={savedBillId}
                    disabled={linkWorking}
                    onChange={(event) => setSavedBillId(event.target.value)}
                  >
                    <option value="">Choose a supplier bill</option>
                    {unlinkedSupplierBills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.personName || "Supplier to add"} ·{" "}
                        {bill.number || "No number"} · {money(bill.total)}
                        {bill.issueDate
                          ? ` · ${shortDate(bill.issueDate)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Linking adds no new charge or payment. Only choose a bill for
                  this car.
                </p>
                <div className={styles.actions}>
                  <button
                    className="button primary"
                    disabled={linkWorking || !savedBillId}
                  >
                    {linkWorking ? "Linking…" : "Link bill to car"}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={linkWorking}
                    onClick={() => setLinkingBill(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>No saved supplier bills are waiting to be linked.</p>
                <Link
                  className="button secondary"
                  href={`/bills/new?direction=PURCHASE&car=${car.id}`}
                >
                  Add supplier bill
                </Link>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setLinkingBill(false)}
                >
                  Close
                </button>
              </>
            )}
            {linkError && (
              <p className="inline-alert error" role="alert">
                {linkError}
              </p>
            )}
          </form>
        )}
        {supplierBills.length ? (
          <div className={styles.history}>
            {supplierBills.map((bill) => (
              <article key={bill.id}>
                <div>
                  <Link href={`/bills/${bill.id}`}>
                    <strong>
                      {bill.personName || "Supplier to add"} ·{" "}
                      {bill.number || "Bill without number"}
                    </strong>
                  </Link>
                  <p>
                    {bill.status === "DRAFT"
                      ? "Draft — finish when ready"
                      : bill.status === "CANCELLED"
                        ? "Cancelled"
                        : bill.balance > 0
                          ? "Amount still to pay"
                          : "Settled"}
                    {bill.issueDate ? ` · ${shortDate(bill.issueDate)}` : ""}
                  </p>
                  {bill.note && <p>{bill.note}</p>}
                </div>
                <div>
                  <strong>{money(bill.total)} total</strong>
                  {bill.status === "POSTED" && (
                    <p>{money(bill.balance)} left to pay</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No supplier bill linked to this car yet.</p>
        )}
      </section>
      {story.receipts.length > 0 && (
        <section className={styles.section}>
          <h2>Customer payments — who paid and who collected</h2>
          <p>
            A different payer does not change whose customer bill was settled. A
            collection by a worker is separate from their later handover.
          </p>
          <div className={styles.history}>
            {story.receipts.map((receipt) => (
              <article key={receipt.id}>
                <div>
                  <strong>
                    {receipt.payer
                      ? `Paid by ${receipt.payer}`
                      : `Payment for ${receipt.customer || "this car"}`}
                  </strong>
                  {receipt.payer && receipt.customer && (
                    <p>Customer bill: {receipt.customer}</p>
                  )}
                  <p>{receipt.handledBy}</p>
                  <small>{shortDate(receipt.date)}</small>
                  {receipt.href && (
                    <p>
                      <Link href={receipt.href}>Open payment record</Link>
                    </p>
                  )}
                </div>
                <strong className={styles.receiptAmount}>
                  {money(receipt.amount)}
                </strong>
              </article>
            ))}
          </div>
        </section>
      )}
      <section id="car-costs" data-help="car-costs" className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2>Every cost on this car</h2>
            <p>Purchases count when recorded, even if payment comes later.</p>
          </div>
          <Link
            className={`button secondary ${styles.costAction}`}
            href={`/payments/new?direction=OUT&car=${car.id}`}
          >
            <Plus size={18} /> Add a cost
          </Link>
        </div>
        {story.costs.length ? (
          <div className={styles.history}>
            {story.costs.map((cost) => (
              <article key={cost.id}>
                <div>
                  <strong>{cost.description}</strong>
                  <p>
                    {cost.person && `${cost.person} · `}
                    {cost.payment}
                  </p>
                  <small>
                    {shortDate(cost.date)}
                    {cost.overhead ? " · Shared overhead, excluded above" : ""}
                    {cost.needsReview ? " · Needs checking" : ""}
                  </small>
                  {cost.href && (
                    <p>
                      <Link href={cost.href}>Open supporting record</Link>
                    </p>
                  )}
                </div>
                <strong className={styles.costAmount}>
                  {money(cost.amount)}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <p>No costs recorded for this car yet.</p>
        )}
        {story.workerPaid > 0 && (
          <p className={styles.notice}>
            {money(story.workerPaid)} was paid by workers or other people. Open
            their record to see advances, money they collected and any amount
            still owed to them across all work.
          </p>
        )}
        {story.unmanagedCreditors.length > 0 && (
          <div className={styles.history}>
            {story.unmanagedCreditors.map((creditor) => (
              <article key={creditor.personId}>
                <div>
                  <strong>Earlier credit · {creditor.name}</strong>
                  <p>
                    Credit costs less unallocated payments recorded for this
                    person on this car.
                  </p>
                </div>
                <Link href={`/people/${creditor.personId}`}>
                  {money(creditor.amount)} left · Check records
                </Link>
              </article>
            ))}
          </div>
        )}
        {(story.overhead > 0 || story.personal > 0) && (
          <p className={styles.notice}>
            Not included in direct car costs: shared overhead{" "}
            {money(story.overhead)}; personal spending {money(story.personal)}.
          </p>
        )}
      </section>
      <section data-help="car-work" className={styles.section}>
        <h2>Money and work history</h2>
        <LedgerHistory entries={entries} />
      </section>
      {(previous.length > 0 || jobs.length > 0) && (
        <section className={styles.section}>
          <h2>Earlier records</h2>
          <div className={styles.history}>
            {previous.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>
                    {entry.note.startsWith("[BILL]") ? "Car bill" : entry.label}
                  </strong>
                  <p>{entry.note.replace(/^\[BILL\]\s*/, "")}</p>
                  <small>
                    {shortDate(entry.entryDate)} ·{" "}
                    {entry.personName || "On this car"}
                  </small>
                </div>
                <strong>{money(entry.amount)}</strong>
              </article>
            ))}
            {jobs.map((job) => (
              <article key={job.id}>
                <div>
                  <strong>Work recorded</strong>
                  <p>{job.description}</p>
                  <small>{shortDate(job.workDate)}</small>
                </div>
                <strong>{money(job.amountCharged)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
      {car.promiseDate && (
        <p className={styles.notice}>
          Payment promised: {shortDate(car.promiseDate)} ·{" "}
          {car.promiseStatus?.toLowerCase() || "open"}
        </p>
      )}
      <section className={styles.section}>
        <h2>Car photos and documents</h2>
        <p>Keep the car's photos, registration or other documents here.</p>
        <RecordAttachments linkType="VEHICLE" linkId={car.id} />
      </section>
    </div>
  );
}

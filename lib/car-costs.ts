import type { BillBookSnapshot } from "./bill-types";
import type {
  LedgerEntry,
  LedgerSnapshot,
  LedgerPerson,
  LegacyLedgerEntry,
} from "./ledger-types";
import type {
  InvoiceRecord,
  MoneyEntryRecord,
  PaymentRecord,
  WorkshopJobRecord,
} from "./product-types";
import { fiscalSign } from "./calculations";
import { isCollectableInvoiceStatus } from "./invoice-payment-eligibility";

export const carSum = (values: number[]) =>
  values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;

export interface CarCostRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  person?: string;
  payment: string;
  needsReview?: boolean;
  href?: string;
  overhead?: boolean;
}

export interface CarReceiptRow {
  id: string;
  amount: number;
  date: string;
  customer?: string;
  payer?: string;
  handledBy: string;
  href?: string;
}

interface CarCostInput {
  vehicleId: string;
  entries: LedgerEntry[];
  people: LedgerPerson[];
  previous: LegacyLedgerEntry[];
  jobs: WorkshopJobRecord[];
  oldMoney: MoneyEntryRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  billBook: BillBookSnapshot;
  creditUses?: LedgerSnapshot["creditUses"];
}

/** Attribute only the matched share of a prior payment to a document's car.
 * Its remaining money stays with the source record's original car. */
export function carLedgerShares(
  input: Pick<
    CarCostInput,
    | "vehicleId"
    | "entries"
    | "billBook"
    | "payments"
    | "invoices"
    | "creditUses"
  >,
) {
  const invoiceVehicles = new Map(
    input.invoices.map((invoice) => [invoice.id, invoice.vehicleId]),
  );
  const allocations = new Map<
    string,
    { vehicleId?: string; amount: number }[]
  >();
  const add = (id: string, vehicleId: string | undefined, amount: number) => {
    allocations.set(id, [
      ...(allocations.get(id) || []),
      { vehicleId, amount },
    ]);
  };
  for (const settlement of input.billBook.settlements) {
    if (settlement.kind !== "PAYMENT" || !settlement.existingEntryId) continue;
    const bill = input.billBook.bills.find(
      (item) => item.id === settlement.billId,
    );
    add(settlement.existingEntryId, bill?.vehicleId, settlement.amount);
  }
  for (const payment of input.payments) {
    if (!payment.sourceEntryId) continue;
    const invoice = input.invoices.find(
      (item) => item.id === payment.invoiceId,
    );
    add(payment.sourceEntryId, invoice?.vehicleId, payment.amount);
  }
  for (const use of input.creditUses || []) {
    const source = input.entries.find(
      (entry) => entry.id === use.sourceEntryId,
    );
    const returned = input.entries.find((entry) => entry.id === use.entryId);
    if (!returned) continue;
    const vehicleId = source?.vehicleId || returned.vehicleId;
    add(returned.id, vehicleId, use.amount);
    // Reversals keep a positive face amount but negative cash effects. Give
    // both records the same attribution so a correction cancels on each car.
    if (returned.reversedBy) add(returned.reversedBy, vehicleId, use.amount);
  }
  return input.entries.flatMap((entry) => {
    const vehicleId =
      entry.vehicleId ||
      (entry.invoiceId ? invoiceVehicles.get(entry.invoiceId) : undefined);
    const matches = allocations.get(entry.id) || [];
    const allocated = carSum(matches.map((item) => item.amount));
    const onCar = carSum(
      matches
        .filter((item) => item.vehicleId === input.vehicleId)
        .map((item) => item.amount),
    );
    const amount = carSum([
      vehicleId === input.vehicleId ? entry.amount - allocated : 0,
      onCar,
    ]);
    if (!amount || !entry.amount) return [];
    return [
      {
        entry,
        amount,
        share: amount / entry.amount,
        unallocated:
          vehicleId === input.vehicleId
            ? carSum([entry.amount, -allocated])
            : 0,
      },
    ];
  });
}

export function carCostStory(input: CarCostInput) {
  const shares = carLedgerShares(input);
  const bills = input.billBook.bills.filter(
    (bill) => bill.vehicleId === input.vehicleId,
  );
  const direct = (category?: string) =>
    !["RENT", "UTILITIES", "PERSONAL"].includes(category || "");
  const previousIsOverhead = (entry: LegacyLedgerEntry) => {
    const source = input.oldMoney.find((item) => item.id === entry.sourceId);
    return (
      source && ["SPENT_RENT", "SPENT_UTILITIES"].includes(source.category)
    );
  };
  const directCosts = carSum([
    ...shares
      .filter(({ entry }) => direct(entry.category))
      .map(({ entry, share }) => entry.businessExpense * share),
    ...input.previous
      .filter((entry) => !previousIsOverhead(entry))
      .map((entry) => entry.businessExpense),
    ...input.jobs.map((job) => job.costAmount),
  ]);
  const overhead = carSum([
    ...shares
      .filter(({ entry }) => !direct(entry.category))
      .map(({ entry, share }) => entry.businessExpense * share),
    ...input.previous
      .filter(previousIsOverhead)
      .map((entry) => entry.businessExpense),
  ]);
  const personal = carSum([
    ...shares.map(({ entry, share }) => entry.personalExpense * share),
    ...input.previous.map((entry) => entry.personalExpense),
  ]);
  const costs: CarCostRow[] = [
    ...shares
      .filter(
        ({ entry }) =>
          entry.businessExpense > 0 && !entry.reversalOf && !entry.reversedBy,
      )
      .map(({ entry, share }): CarCostRow => {
        const bill = bills.find((item) => item.chargeEntryId === entry.id);
        const paymentToCheck = bill
          ? input.billBook.settlements.some(
              (settlement) =>
                settlement.billId === bill.id &&
                settlement.kind === "PAYMENT" &&
                !settlement.reversalOf &&
                !settlement.reversedBy &&
                input.entries.some(
                  (item) =>
                    item.id ===
                      (settlement.existingEntryId ||
                        settlement.ledgerEntryId) && item.needsReview,
                ),
            )
          : false;
        return {
          id: entry.id,
          description:
            entry.note ||
            (bill ? `Supplier bill ${bill.number || ""}`.trim() : "Car cost"),
          amount: carSum([entry.businessExpense * share]),
          date: entry.entryDate,
          person: bill?.personName || entry.personName,
          payment: bill
            ? bill.balance > 0
              ? "Supplier bill · payment still due"
              : paymentToCheck
                ? "Payment reported · needs checking"
                : "Supplier bill · settled"
            : entry.kind === "PERSON_SPENT"
              ? "Paid by this person"
              : entry.kind === "CREDIT_PURCHASE"
                ? "Bought on credit · check payments below"
                : "Paid by the workshop",
          needsReview: entry.needsReview || paymentToCheck,
          href: bill ? `/bills/${bill.id}` : `/payments#entry-${entry.id}`,
          overhead: !direct(entry.category),
        };
      }),
    ...input.previous
      .filter((entry) => entry.businessExpense > 0)
      .map((entry): CarCostRow => ({
        id: entry.id,
        description: entry.note || entry.label,
        amount: entry.businessExpense,
        date: entry.entryDate,
        person: entry.personName,
        payment:
          entry.cashOut > 0
            ? "Earlier workshop payment"
            : "Earlier cost · payment not confirmed",
        needsReview: entry.needsReview,
        overhead: Boolean(previousIsOverhead(entry)),
      })),
    ...input.jobs
      .filter((job) => job.costAmount > 0)
      .map((job): CarCostRow => ({
        id: job.id,
        description: job.description,
        amount: job.costAmount,
        date: job.workDate,
        person: job.workerName,
        payment: "Earlier job cost · payment not confirmed",
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const postedInvoices = input.invoices.filter(
    (invoice) =>
      invoice.vehicleId === input.vehicleId &&
      isCollectableInvoiceStatus(invoice),
  );
  const invoiceIds = new Set(postedInvoices.map((invoice) => invoice.id));
  const invoicePayments = input.payments.filter((payment) =>
    invoiceIds.has(payment.invoiceId),
  );
  const cashIn = carSum([
    ...shares.map(({ entry, share }) => entry.cashIn * share),
    ...input.previous.map((entry) => entry.cashIn),
  ]);
  const cashOut = carSum([
    ...shares.map(({ entry, share }) => entry.cashOut * share),
    ...input.previous.map((entry) => entry.cashOut),
  ]);
  const workerPaid = carSum(
    shares
      .filter(({ entry }) =>
        ["PERSON_SPENT", "PERSON_PAID_BILL"].includes(entry.kind),
      )
      .map(({ entry, share }) => -entry.personBalanceChange * share),
  );
  const unpaidSupplierBills = bills.filter(
    (bill) =>
      bill.direction === "PURCHASE" &&
      bill.status === "POSTED" &&
      direct(bill.category),
  );
  const managedChargeIds = new Set(
    input.billBook.bills.map((bill) => bill.chargeEntryId).filter(Boolean),
  );
  const settlementEntryIds = new Set(
    input.billBook.settlements.map((settlement) => settlement.ledgerEntryId),
  );
  const unmanagedCreditors = [
    ...new Set(
      shares
        .filter(
          ({ entry }) =>
            entry.kind === "CREDIT_PURCHASE" &&
            direct(entry.category) &&
            entry.personId &&
            !managedChargeIds.has(entry.id) &&
            !managedChargeIds.has(entry.reversalOf),
        )
        .map(({ entry }) => entry.personId!),
    ),
  ]
    .map((personId) => {
      const charged = carSum(
        shares
          .filter(
            ({ entry }) =>
              entry.kind === "CREDIT_PURCHASE" &&
              entry.personId === personId &&
              direct(entry.category) &&
              !managedChargeIds.has(entry.id) &&
              !managedChargeIds.has(entry.reversalOf),
          )
          .map(({ entry, share }) => -entry.personBalanceChange * share),
      );
      const paid = carSum(
        shares
          .filter(
            ({ entry }) =>
              ((["GIVE_MONEY", "ADVANCE_GIVEN"].includes(entry.kind) &&
                entry.personId === personId) ||
                (entry.kind === "PERSON_PAID_BILL" &&
                  entry.counterpartyId === personId)) &&
              !settlementEntryIds.has(entry.id),
          )
          .map(
            ({ entry, unallocated }) =>
              (entry.kind === "PERSON_PAID_BILL"
                ? entry.counterpartyBalanceChange
                : entry.personBalanceChange) *
              (unallocated / entry.amount),
          ),
      );
      return {
        personId,
        name:
          input.people.find((person) => person.id === personId)?.name ||
          "Recorded supplier",
        amount: Math.max(0, carSum([charged, -paid])),
      };
    })
    .filter((person) => person.amount > 0);
  const costsOwed = carSum([
    ...unpaidSupplierBills.map((bill) => bill.balance),
    ...unmanagedCreditors.map((person) => person.amount),
  ]);
  const invoiceCharged = carSum(
    postedInvoices.map(
      (invoice) => fiscalSign(invoice.documentType) * invoice.total,
    ),
  );
  const invoicePaid = carSum(
    invoicePayments
      .filter((payment) => payment.method !== "OFFSET")
      .map((payment) => payment.amount),
  );
  const invoiceOffsets = carSum(
    invoicePayments
      .filter((payment) => payment.method === "OFFSET")
      .map((payment) => payment.amount),
  );
  const uncheckedCosts = carSum(
    shares
      .filter(({ entry }) => entry.needsReview && direct(entry.category))
      .map(({ entry, share }) => entry.businessExpense * share),
  );
  const uncheckedPayments = carSum(
    shares
      .filter(
        ({ entry }) => entry.needsReview && entry.kind === "PERSON_PAID_BILL",
      )
      .map(({ entry, share }) => entry.amount * share),
  );
  const saleIds = new Set(
    bills.filter((bill) => bill.direction === "SALE").map((bill) => bill.id),
  );
  const salePayments = input.billBook.settlements.filter(
    (settlement) =>
      settlement.kind === "PAYMENT" && saleIds.has(settlement.billId),
  );
  const saleDebtors = new Set(
    shares
      .filter(({ entry }) => entry.kind === "CREDIT_SALE")
      .map(({ entry }) => entry.personId),
  );
  const handledBy = (entry?: LedgerEntry) =>
    entry &&
    ["PERSON_COLLECTED", "ADVANCE_COLLECTED", "INVOICE_COLLECTED"].includes(
      entry.kind,
    )
      ? `Collected by ${entry.personName || "another person"}`
      : "Received by workshop";
  const standalone = shares.filter(
    ({ entry }) =>
      !entry.reversalOf &&
      !entry.reversedBy &&
      !settlementEntryIds.has(entry.id) &&
      ([
        "INCOME",
        "PERSON_COLLECTED",
        "ADVANCE_RECEIVED",
        "ADVANCE_COLLECTED",
      ].includes(entry.kind) ||
        (entry.kind === "RECEIVE_MONEY" && saleDebtors.has(entry.personId))),
  );
  // Source amounts remain positive on correction rows. Count active receipts
  // only, and retain just the unused part after document matches or refunds.
  const remainingReceipt = (entry: LedgerEntry, unallocated: number) =>
    Math.max(0, Math.min(unallocated, entry.availableAmount));
  const oldReceipts = input.oldMoney.filter(
    (entry) =>
      !entry.invoiceId &&
      ["EARNED_FROM_CAR", "CUSTOMER_PAYMENT"].includes(entry.category),
  );
  const customerPaid = carSum([
    invoicePaid,
    ...salePayments.map((payment) => payment.amount),
    ...standalone.map(({ entry, unallocated }) =>
      remainingReceipt(entry, unallocated),
    ),
    ...oldReceipts.map((entry) => entry.amount),
  ]);
  const receipts: CarReceiptRow[] = [
    ...invoicePayments
      .filter(
        (payment) =>
          payment.method !== "OFFSET" &&
          !payment.reversalOf &&
          !payment.reversedBy,
      )
      .map((payment): CarReceiptRow => {
        const entry = input.entries.find(
          (item) =>
            item.id === (payment.sourceEntryId || payment.ledgerEntryId),
        );
        return {
          id: payment.id,
          amount: payment.amount,
          date: payment.paidAt,
          customer: payment.customerName,
          payer: payment.payerName || entry?.payerName,
          handledBy: `${handledBy(entry)}${payment.sourceEntryId ? " · Earlier payment matched" : ""}`,
          href: `/invoices/${payment.invoiceId}`,
        };
      }),
    ...salePayments
      .filter((payment) => !payment.reversalOf && !payment.reversedBy)
      .map((payment): CarReceiptRow => {
        const entry = input.entries.find(
          (item) =>
            item.id === (payment.existingEntryId || payment.ledgerEntryId),
        );
        return {
          id: payment.id,
          amount: payment.amount,
          date: payment.entryDate,
          customer: payment.personName,
          payer: entry?.payerName,
          handledBy: `${handledBy(entry)}${payment.existingEntryId ? " · Earlier payment matched" : ""}`,
          href: `/bills/${payment.billId}`,
        };
      }),
    ...standalone
      .filter(
        ({ entry, unallocated }) => remainingReceipt(entry, unallocated) > 0,
      )
      .map(({ entry, unallocated }): CarReceiptRow => ({
        id: entry.id,
        amount: remainingReceipt(entry, unallocated),
        date: entry.entryDate,
        customer: ["PERSON_COLLECTED", "ADVANCE_COLLECTED"].includes(entry.kind)
          ? entry.counterpartyName
          : entry.personName,
        payer: entry.payerName,
        handledBy: `${handledBy(entry)}${entry.kind.startsWith("ADVANCE") ? " · Advance left for this car" : ""}`,
        href: `/payments#entry-${entry.id}`,
      })),
    ...oldReceipts.map((entry): CarReceiptRow => ({
      id: entry.id,
      amount: entry.amount,
      date: entry.entryDate,
      customer: entry.customerName,
      payer: entry.partyName,
      handledBy: "Earlier workshop receipt",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return {
    shares,
    costs,
    directCosts,
    overhead,
    personal,
    cashIn,
    cashOut,
    workerPaid,
    costsOwed,
    unpaidSupplierBills,
    unmanagedCreditors,
    invoiceCharged,
    invoicePaid,
    invoiceOffsets,
    invoicePayments,
    uncheckedCosts,
    uncheckedPayments,
    customerPaid,
    receipts,
  };
}

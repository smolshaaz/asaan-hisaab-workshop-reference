import type { BillBookSnapshot } from "./bill-types";
import type { LedgerPerson, LedgerSnapshot } from "./ledger-types";
import type { CustomerRecord, InvoiceRecord } from "./product-types";
import { isPostedStatus } from "./calculations";
import { isCollectableInvoiceStatus } from "./invoice-payment-eligibility";

export interface AccountSource {
  ledger: LedgerSnapshot;
  billBook: BillBookSnapshot;
  invoices: InvoiceRecord[];
  customers: CustomerRecord[];
}

export interface AccountItem {
  id: string;
  source: "INVOICE" | "BILL" | "OTHER";
  personId?: string;
  customerId?: string;
  personName: string;
  title: string;
  href: string;
  /** Positive: they owe us. Negative: we owe them / customer credit. */
  balance: number;
  date?: string;
  dueDate?: string;
  collectable: boolean;
  explanation: string;
}

const cents = (value: number) => Math.round(value * 100);
const total = (values: number[]) =>
  values.reduce((sum, value) => sum + cents(value), 0) / 100;

/** Matches the canonical generated-invoice payment restrictions. */
export function invoiceCanCollect(invoice: InvoiceRecord) {
  return isCollectableInvoiceStatus(invoice);
}

export function documentAccountItems(data: AccountSource): AccountItem[] {
  const invoices = data.invoices.flatMap((invoice): AccountItem[] => {
    if (!isPostedStatus(invoice.status)) return [];
    const remaining = Math.max(
      0,
      cents(invoice.total) -
        cents(invoice.paidAmount) -
        cents(invoice.badDebtAmount),
    );
    if (!remaining) return [];
    const credit = invoice.documentType === "CREDIT_NOTE";
    const person = data.ledger.people.find(
      (item) => item.customerId === invoice.customerId,
    );
    const eligible = invoiceCanCollect(invoice);
    return [
      {
        id: invoice.id,
        source: "INVOICE",
        personId: person?.id,
        customerId: invoice.customerId,
        personName: invoice.customer.name,
        title:
          invoice.number || (credit ? "Customer credit" : "Customer invoice"),
        href: `/invoices/${invoice.id}`,
        balance: (remaining / 100) * (credit ? -1 : 1),
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        collectable: eligible && !credit,
        explanation: credit
          ? "Customer credit; not automatically matched to an invoice"
          : eligible
            ? "Invoice amount left after payments, settlements and write-offs"
            : "Awaiting clearance; not ready to collect here",
      },
    ];
  });
  const bills = data.billBook.bills.flatMap((bill): AccountItem[] => {
    if (bill.status !== "POSTED" || cents(bill.balance) <= 0) return [];
    const sale = bill.direction === "SALE";
    return [
      {
        id: bill.id,
        source: "BILL",
        personId: bill.personId,
        personName: bill.personName || "Person to check",
        title: bill.number || (sale ? "Customer bill" : "Supplier bill"),
        href: `/bills/${bill.id}`,
        balance: (cents(bill.balance) / 100) * (sale ? 1 : -1),
        date: bill.issueDate,
        dueDate: bill.dueDate,
        collectable: sale,
        explanation: sale
          ? "Customer bill amount left after payments and settlements"
          : "Supplier bill amount left after payments and settlements",
      },
    ];
  });
  return [...invoices, ...bills];
}

export function personAccount(
  data: AccountSource,
  person: LedgerPerson,
  documentItems = documentAccountItems(data),
) {
  const documents = documentItems.filter((item) => item.personId === person.id);
  const billBalance = total(
    documents
      .filter((item) => item.source === "BILL")
      .map((item) => item.balance),
  );
  // Bill charges, cash payments, worker collections, offsets and earlier-payment
  // matches are already reflected in both the ledger and current bill balances.
  // Subtract their net before displaying the other money-book balance.
  const otherBalance = (cents(person.balance) - cents(billBalance)) / 100;
  const confirmedOtherBalance =
    (cents(person.confirmedBalance) - cents(billBalance)) / 100;
  const entries = data.ledger.entries.filter(
    (entry) =>
      entry.personId === person.id ||
      entry.counterpartyId === person.id ||
      entry.payerPersonId === person.id,
  );
  const pending = entries.filter(
    (entry) => entry.needsReview && !entry.reversalOf && !entry.reversedBy,
  );
  const other: AccountItem[] = otherBalance
    ? [
        {
          id: `other:${person.id}`,
          source: "OTHER",
          personId: person.id,
          personName: person.name,
          title: "Other money-book balance",
          href: `/people/${person.id}#person-history`,
          balance: otherBalance,
          collectable: otherBalance > 0,
          explanation:
            "Advances, unmatched payments and other records, excluding the bill balances shown above",
        },
      ]
    : [];
  const items = [...documents, ...other];
  const invoiceBalance = total(
    documents
      .filter((item) => item.source === "INVOICE")
      .map((item) => item.balance),
  );
  return {
    person,
    items,
    documents,
    entries,
    pending,
    billBalance,
    invoiceBalance,
    otherBalance,
    confirmedOtherBalance,
    theyOwe: total(items.map((item) => Math.max(0, item.balance))),
    weOwe: total(items.map((item) => Math.max(0, -item.balance))),
    net: total([person.balance, invoiceBalance]),
    confirmedNet: total([person.confirmedBalance, invoiceBalance]),
    pendingAmount: total(pending.map((entry) => entry.amount)),
  };
}

export type TodayActionTone = "in" | "out" | "review";
export interface TodayAction {
  id: string;
  title: string;
  amount?: number;
  reason: string;
  href: string;
  button: string;
  tone: TodayActionTone;
  priority: number;
}

/** Suggestions explain saved records. They never mark a debt paid or forecast cash. */
export function todayAccountActions(
  data: AccountSource,
  today: string,
): TodayAction[] {
  const items = documentAccountItems(data);
  const actions: TodayAction[] = [];
  const nextWeek = new Date(`${today}T12:00:00Z`);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const weekEnd = nextWeek.toISOString().slice(0, 10);
  const collectGroups = new Map<string, AccountItem[]>();
  for (const item of items.filter(
    (item) => item.collectable && item.balance > 0,
  )) {
    const key = item.personId || item.customerId || item.id;
    collectGroups.set(key, [...(collectGroups.get(key) || []), item]);
  }
  for (const [key, group] of collectGroups) {
    const first = group[0];
    const customer = data.customers.find(
      (item) =>
        item.id === first.customerId ||
        data.ledger.people.find((person) => person.id === first.personId)
          ?.customerId === item.id,
    );
    const missedPromise =
      !!customer?.promiseDate &&
      customer.promiseDate <= today &&
      customer.promiseStatus !== "KEPT";
    const overdue = group.filter(
      (item) => item.dueDate && item.dueDate <= today,
    );
    const undated = group.filter((item) => !item.dueDate);
    const relevant = missedPromise ? group : overdue.length ? overdue : undated;
    if (!relevant.length) continue;
    const linkedPerson = data.ledger.people.find(
      (person) => person.id === first.personId,
    );
    const account = linkedPerson
      ? personAccount(data, linkedPerson, items)
      : undefined;
    const hasCredit = account
      ? account.weOwe > 0
      : items.some(
          (item) => item.customerId === first.customerId && item.balance < 0,
        );
    actions.push({
      id: `collect:${key}`,
      title: missedPromise
        ? `Follow up with ${first.personName}`
        : overdue.length
          ? `Payment due from ${first.personName}`
          : `Agree a payment date with ${first.personName}`,
      amount: total(relevant.map((item) => item.balance)),
      tone: "in",
      priority: missedPromise ? 0 : overdue.length ? 1 : 5,
      reason: `${missedPromise ? "Their promised date is today or has passed." : overdue.length ? `${overdue.length} open invoice${overdue.length === 1 ? " is" : "s are"} due.` : `${undated.length} open invoice${undated.length === 1 ? " has" : "s have"} no payment date.`} ${hasCredit ? "Money is recorded both ways; check credits and payments before collecting." : "Open the records before recording a payment."}`,
      href: first.personId
        ? `/people/${first.personId}`
        : `/customers/${first.customerId}`,
      button: "Review amount to collect",
    });
  }
  for (const item of items.filter(
    (item) => item.source === "BILL" && item.balance < 0,
  )) {
    const due = !!item.dueDate && item.dueDate <= weekEnd;
    if (item.dueDate && !due) continue;
    actions.push({
      id: `pay:${item.id}`,
      title: `${item.dueDate ? "Plan payment to" : "Add a payment date for"} ${item.personName}`,
      amount: -item.balance,
      tone: "out",
      priority: !item.dueDate ? 6 : item.dueDate < today ? 2 : 4,
      reason: `${item.title} · ${!item.dueDate ? "No payment date recorded." : item.dueDate < today ? `Due date passed (${item.dueDate}).` : `Due ${item.dueDate}.`} This is the amount left on that bill.`,
      href: item.href,
      button: "Review supplier bill",
    });
  }
  for (const person of data.ledger.people) {
    const account = personAccount(data, person, items);
    if (
      account.pending.length ||
      (person.roles.includes("WORKER") && account.otherBalance !== 0)
    ) {
      actions.push({
        id: `worker:${person.id}`,
        title: `Check ${person.name}’s account`,
        amount: account.pending.length
          ? account.pendingAmount
          : Math.abs(account.otherBalance),
        tone: "review",
        priority: account.pending.length ? 1 : 5,
        reason: account.pending.length
          ? `${account.pending.length} reported expense${account.pending.length === 1 ? " needs" : "s need"} checking. Review receipts before deciding what to hand over.`
          : "Advances, spending and collections leave a balance. Check the records together; this is not a count of cash they hold.",
        href: `/people/${person.id}`,
        button: "Check their records",
      });
    } else if (account.otherBalance > 0) {
      actions.push({
        id: `other:${person.id}`,
        title: `Review money due from ${person.name}`,
        amount: account.otherBalance,
        tone: "in",
        priority: 6,
        reason:
          "This money-book balance is outside the open bills shown above. Check its advances, payments and earlier debts before collecting.",
        href: `/people/${person.id}#person-history`,
        button: "Review supporting records",
      });
    } else if (account.otherBalance < 0) {
      actions.push({
        id: `other:${person.id}`,
        title: `Review ${person.name}’s credit or amount owed`,
        amount: -account.otherBalance,
        tone: "review",
        priority: 6,
        reason:
          "Their other money-book records leave a balance in their favour. Check whether it is money to pay back or an advance to apply; no payment date is attached to this balance.",
        href: `/people/${person.id}#person-history`,
        button: "Review supporting records",
      });
    }
    const candidate = account.documents.find((document) => {
      const incoming = document.balance > 0;
      if (incoming && !document.collectable) return false;
      return account.entries.some((entry) => {
        if (
          entry.reversalOf ||
          entry.reversedBy ||
          entry.needsReview ||
          !(entry.availableAmount > 0)
        )
          return false;
        return incoming
          ? (["RECEIVE_MONEY", "ADVANCE_RECEIVED"].includes(entry.kind) &&
              entry.personId === person.id) ||
              (["PERSON_COLLECTED", "ADVANCE_COLLECTED"].includes(entry.kind) &&
                entry.counterpartyId === person.id)
          : (["GIVE_MONEY", "ADVANCE_GIVEN"].includes(entry.kind) &&
              entry.personId === person.id) ||
              (entry.kind === "PERSON_PAID_BILL" &&
                entry.counterpartyId === person.id);
      });
    });
    if (candidate) {
      const incoming = candidate.balance > 0;
      const earlier = account.entries.find(
        (entry) =>
          !entry.reversalOf &&
          !entry.reversedBy &&
          !entry.needsReview &&
          entry.availableAmount > 0 &&
          (incoming
            ? (["RECEIVE_MONEY", "ADVANCE_RECEIVED"].includes(entry.kind) &&
                entry.personId === person.id) ||
              (["PERSON_COLLECTED", "ADVANCE_COLLECTED"].includes(entry.kind) &&
                entry.counterpartyId === person.id)
            : (["GIVE_MONEY", "ADVANCE_GIVEN"].includes(entry.kind) &&
                entry.personId === person.id) ||
              (entry.kind === "PERSON_PAID_BILL" &&
                entry.counterpartyId === person.id)),
      )!;
      const params = new URLSearchParams({
        direction: incoming ? "IN" : "OUT",
        person: person.id,
        [candidate.source === "INVOICE" ? "invoice" : "bill"]: candidate.id,
        credit: earlier.id,
      });
      actions.push({
        id: `match:${person.id}`,
        title: `Check an earlier payment for ${person.name}`,
        amount: Math.min(earlier.availableAmount, Math.abs(candidate.balance)),
        tone: "review",
        priority: 2,
        reason: `A payment from ${earlier.entryDate} and an open ${incoming ? "customer invoice" : "supplier bill"} may belong together. Review before recording another payment; matching adds no cash movement.`,
        href: `/payments/new?${params}`,
        button: "Review earlier payment",
      });
    }
    const purchase = account.documents.find(
      (item) => item.source === "BILL" && item.balance < 0,
    );
    const sale = account.documents.find(
      (item) =>
        item.collectable &&
        item.balance > 0 &&
        (item.source === "BILL" ||
          data.invoices.find((invoice) => invoice.id === item.id)
            ?.documentType === "INVOICE"),
    );
    if (purchase && sale) {
      actions.push({
        id: `offset:${person.id}`,
        title: `Amounts are owed both ways with ${person.name}`,
        amount: Math.min(-purchase.balance, sale.balance),
        tone: "review",
        priority: 3,
        reason:
          "Review whether both sides agree to settle one bill against the other. This suggestion has not settled anything and brings in no cash.",
        href: purchase.href,
        button: "Review a possible settlement",
      });
    }
  }
  return actions.sort(
    (a, b) => a.priority - b.priority || (b.amount || 0) - (a.amount || 0),
  );
}

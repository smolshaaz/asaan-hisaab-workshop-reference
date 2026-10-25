import type { LedgerEntry, LedgerExpenseCategory } from "./ledger-types";
import { money } from "./format";

export const expenseCategoryLabel: Record<LedgerExpenseCategory, string> = {
  PARTS: "Parts and materials",
  OUTSOURCED_WORK: "Work done outside the workshop",
  WAGES: "Worker pay",
  RENT: "Rent",
  UTILITIES: "Electricity, water and other bills",
  BUSINESS: "Other business expense",
  PERSONAL: "Personal / non-business",
};

export function recordedBalanceText(balance: number) {
  const rounded = Math.round(balance * 100) / 100;
  return rounded === 0
    ? "Settled — nothing owed"
    : `${rounded > 0 ? "They owe us" : "We owe them"} ${money(Math.abs(rounded))}`;
}

/** Describe this event, without implying an old unpaid charge is still unpaid. */
export function recordMoneyLabel(entry: LedgerEntry) {
  if (entry.reversalOf) return "Earlier record undone";
  if (entry.cashIn > 0) return "Received by workshop";
  if (entry.cashOut > 0) return "Paid by workshop";
  switch (entry.kind) {
    case "INVOICE_COLLECTED":
    case "ADVANCE_COLLECTED":
      return "Held by this person";
    case "PERSON_PAID_BILL":
      return "Paid by this person";
    case "INVOICE_ALLOCATION":
      return "Earlier payment matched";
    case "PERSON_SPENT":
      return "Paid by this person";
    case "PERSON_COLLECTED":
      return "Collected for workshop";
    case "CREDIT_PURCHASE":
      return "Bought with payment due later";
    case "CREDIT_SALE":
      return "Charged with payment due later";
    case "OFFSET":
      return "Settled using another invoice";
    case "BILL_ALLOCATION":
      return "Earlier payment matched";
    case "OPENING_OWED_TO_US":
    case "OPENING_WE_OWE":
      return "Balance from earlier work";
    default:
      return "Balance record";
  }
}

export function recordMoneyExplanation(entry: LedgerEntry) {
  if (entry.reversalOf)
    return "This undoes the earlier record's amounts. It does not record a new payment.";
  if (entry.kind === "ADVANCE_RECEIVED")
    return "The workshop received money before the work was charged. It stays as this customer's credit until used or returned; it is not another sale.";
  if (entry.kind === "ADVANCE_GIVEN")
    return "The workshop gave this person money in advance. Spending or a later supplier bill is recorded separately; this is not an expense.";
  if (entry.kind === "ADVANCE_COLLECTED")
    return "This person collected a customer's advance. The money is with them; the customer keeps credit until it is used or returned.";
  if (entry.kind === "PERSON_PAID_BILL")
    return "This person paid the supplier for the workshop. It reduces the supplier's balance and changes what this person holds for us or is owed back. No second expense or workshop payment was added.";
  if (entry.kind === "INVOICE_RECEIPT")
    return "The workshop received this payment and the linked customer's invoice balance was reduced. It is not another sale.";
  if (entry.kind === "INVOICE_COLLECTED")
    return "This person collected the invoice payment for the workshop. The customer invoice was settled by this amount; the money stays with the collector until handed over.";
  if (entry.kind === "INVOICE_ALLOCATION")
    return "An earlier payment or advance was used against this invoice. No money was received again. Any unused amount stays available to match or return.";
  if (entry.kind === "PERSON_SPENT")
    return `${entry.personName || "This person"} reported paying this cost for the workshop. It reduces money they hold for us, or increases what we owe them. This record does not add another workshop payment.`;
  if (entry.kind === "PERSON_COLLECTED")
    return `${entry.personName || "This person"} collected this payment${entry.counterpartyName ? ` from ${entry.counterpartyName}` : ""} for the workshop. Receiving the money back from them is a separate record.`;
  if (entry.kind === "CREDIT_PURCHASE")
    return "This records a purchase or cost to pay later. Payments are recorded separately, so the expense is counted once.";
  if (entry.kind === "CREDIT_SALE")
    return "This records work charged to the customer. Receiving their payment is a separate record.";
  if (entry.kind === "OFFSET")
    return "Amounts owed in both directions were used to settle each other. Open the linked documents to see how much remains.";
  if (entry.kind === "BILL_ALLOCATION")
    return "A payment already in the money book was matched to this bill. No second payment or expense was added.";
  if (entry.kind === "GIVE_MONEY")
    return "The workshop gave this money to the person. It may be an advance or money owed back; it is not another expense.";
  if (entry.kind === "RECEIVE_MONEY")
    return "The workshop received this money against the person's balance. It is not another sale.";
  if (entry.kind.startsWith("OPENING_"))
    return "This is an amount owed from before these records began. No payment was recorded with it.";
  if (entry.kind === "OWNER_IN" || entry.kind === "OWNER_OUT")
    return "This older owner-funding record remains in history. It is not a sale or a business expense.";
  return entry.cashIn > 0
    ? "The workshop received this payment for new work."
    : "The workshop paid this cost.";
}

/** Display-only statement balances, using every record even when the view is filtered. */
export function statementBalances(entries: LedgerEntry[]) {
  const balances = new Map<string, number>();
  const result = new Map<
    string,
    Map<string, { before: number; after: number }>
  >();
  [...entries]
    .reverse()
    .sort(
      (a, b) =>
        a.entryDate.localeCompare(b.entryDate) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .forEach((entry) => {
      const people = new Map<string, { before: number; after: number }>();
      const changes: [string | undefined, number][] = [
        [entry.personId, entry.personBalanceChange],
        [entry.counterpartyId, entry.counterpartyBalanceChange],
      ];
      for (const [id, change] of changes) {
        if (!id) continue;
        const before = balances.get(id) || 0;
        const after = before + Math.round(change * 100);
        people.set(id, { before: before / 100, after: after / 100 });
        balances.set(id, after);
      }
      result.set(entry.id, people);
    });
  return result;
}

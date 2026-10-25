"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CarMoveRecord,
  CatalogItem,
  CustomerRecord,
  ExpenseRecord,
  InvoiceRecord,
  MoneyEntryRecord,
  PaymentRecord,
  QuotationRecord,
  VehicleRecord,
} from "@/lib/product-types";
import type { LedgerEntry, LedgerPerson } from "@/lib/ledger-types";
import type { BillRecord } from "@/lib/bill-types";
import {
  makeReferenceSnapshot,
  REFERENCE_STORAGE_KEY,
  type Snapshot,
} from "@/lib/reference-data";

interface ProductContextValue {
  data: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: <T>(url: string, init?: RequestInit) => Promise<T>;
}

const ProductContext = createContext<ProductContextValue | null>(null);

function readSnapshot(): Snapshot {
  const seed = makeReferenceSnapshot();
  try {
    const raw = window.localStorage.getItem(REFERENCE_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const saved = JSON.parse(raw) as Partial<Snapshot>;
    if (!saved.ledger || !saved.billBook || !Array.isArray(saved.customers)) {
      window.localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return { ...seed, ...saved, storage: { mode: "local", durable: true } };
  } catch {
    return { ...seed, storage: { mode: "local", durable: false } };
  }
}

function saveSnapshot(snapshot: Snapshot) {
  try {
    window.localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

function localId(kind: string) {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `local-${kind}-${token}`;
}

function makeEntry(
  input: Record<string, unknown>,
  data: Snapshot,
  id = localId("entry"),
): LedgerEntry {
  const personId = typeof input.personId === "string" ? input.personId : undefined;
  const person = data.ledger.people.find((item) => item.id === personId);
  const vehicleId =
    typeof input.vehicleId === "string" ? input.vehicleId : undefined;
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const entryDate =
    typeof input.entryDate === "string"
      ? input.entryDate
      : new Date().toISOString().slice(0, 10);
  const amount = Number(input.amount) || Number(input.paidNow) || 0;
  const direction = input.direction === "OUT" ? "OUT" : "IN";
  const now = new Date().toISOString();
  const noMovement = input.purpose === "OPENING" || input.timing === "LATER";
  const cash = noMovement ? 0 : amount;
  const cashIn = direction === "IN" ? cash : 0;
  const cashOut = direction === "OUT" ? cash : 0;
  const kind = direction === "IN" ? "INCOME" : "EXPENSE";
  return {
    id,
    kind,
    amount,
    personId,
    personName:
      person?.name ||
      (typeof input.personName === "string" ? input.personName : undefined),
    vehicleId,
    plateNumber: vehicle?.plateNumber,
    category:
      typeof input.category === "string"
        ? (input.category as LedgerEntry["category"])
        : undefined,
    note: typeof input.note === "string" ? input.note : "",
    entryDate,
    paymentMethod:
      typeof input.paymentMethod === "string"
        ? (input.paymentMethod as LedgerEntry["paymentMethod"])
        : "CASH",
    attachmentIds: [],
    allocatedAmount: 0,
    availableAmount: direction === "IN" ? amount : 0,
    createdAt: now,
    cashIn,
    cashOut,
    cashChange: cashIn - cashOut,
    income: direction === "IN" ? cash : 0,
    businessExpense: direction === "OUT" ? cash : 0,
    personalExpense: 0,
    personBalanceChange: 0,
    counterpartyBalanceChange: 0,
  } as LedgerEntry;
}

function withRecord<T extends { id: string }>(
  records: T[],
  record: T,
  id: string | undefined,
  method: string,
) {
  if (method === "DELETE") return records.filter((item) => item.id !== id);
  const index = records.findIndex((item) => item.id === (id || record.id));
  if (index < 0) return [...records, record];
  return records.map((item, position) =>
    position === index ? { ...item, ...record, id: item.id } : item,
  );
}

function changedSnapshot(
  source: Snapshot,
  resource: string,
  id: string | undefined,
  action: string | undefined,
  method: string,
  input: Record<string, unknown>,
) {
  const data = structuredClone(source) as Snapshot;
  const now = new Date().toISOString();
  let result: unknown;
  const recordId = id || (typeof input.id === "string" ? input.id : undefined);

  if (resource === "organisation") {
    data.organisation = { ...data.organisation, ...input };
    result = data.organisation;
  } else if (resource === "customers") {
    const old = data.customers.find((item) => item.id === recordId);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("customer"),
      status: old?.status || "ACTIVE",
      outstanding: old?.outstanding || 0,
      promiseHistory: old?.promiseHistory || [],
      createdAt: old?.createdAt || now,
    } as CustomerRecord;
    data.customers = withRecord(data.customers, record, id, method);
    result = record;
  } else if (resource === "vehicles") {
    const old = data.vehicles.find((item) => item.id === recordId);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("car"),
      plateNumber: String(input.plateNumber || old?.plateNumber || ""),
      promiseHistory: old?.promiseHistory || [],
      createdAt: old?.createdAt || now,
      updatedAt: now,
    } as VehicleRecord;
    data.vehicles = withRecord(data.vehicles, record, id, method);
    result = record;
  } else if (resource === "items") {
    const old = data.items.find((item) => item.id === recordId);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("item"),
      sku: String(input.sku || old?.sku || ""),
      name: String(input.name || old?.name || ""),
      description: String(input.description || old?.description || ""),
      unitCode: String(input.unitCode || old?.unitCode || "EA"),
      unitPrice: Number(input.unitPrice ?? old?.unitPrice ?? 0),
      vatCategory: input.vatCategory || old?.vatCategory || "S",
      vatRate: Number(input.vatRate ?? old?.vatRate ?? 15),
      active: input.active ?? old?.active ?? true,
      createdAt: old?.createdAt || now,
    } as CatalogItem;
    data.items = withRecord(data.items, record, id, method);
    result = record;
  } else if (resource === "quotations") {
    const old = data.quotations.find((item) => item.id === recordId);
    const customerId = String(input.customerId || old?.customerId || "");
    const customer =
      data.customers.find((item) => item.id === customerId) ||
      old?.customer ||
      data.customers[0];
    const lines = (input.lines as QuotationRecord["lines"] | undefined) || old?.lines || [];
    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice - line.discount,
      0,
    );
    const vatTotal = lines.reduce(
      (sum, line) =>
        sum +
        (input.taxEnabled === false ? 0 : (line.quantity * line.unitPrice - line.discount) * line.vatRate / 100),
      0,
    );
    const record = {
      ...old,
      ...input,
      id: recordId || localId("quotation"),
      number: String(input.number || old?.number || "Draft quotation"),
      customerId,
      customer,
      issueDate: String(input.issueDate || old?.issueDate || new Date().toISOString().slice(0, 10)),
      taxEnabled: input.taxEnabled ?? old?.taxEnabled ?? true,
      status: old?.status || "DRAFT",
      currency: "SAR",
      lines,
      notes: String(input.notes || old?.notes || ""),
      terms: String(input.terms || old?.terms || ""),
      subtotal,
      vatTotal,
      total: subtotal + vatTotal,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    } as QuotationRecord;
    data.quotations = withRecord(data.quotations, record, id, method);
    result = record;
  } else if (resource === "invoices") {
    const old = data.invoices.find((item) => item.id === recordId);
    const customerId = String(input.customerId || old?.customerId || "");
    const customer =
      data.customers.find((item) => item.id === customerId) ||
      old?.customer ||
      data.customers[0];
    const lines = (input.lines as InvoiceRecord["lines"] | undefined) || old?.lines || [];
    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice - line.discount,
      0,
    );
    const vatTotal = lines.reduce(
      (sum, line) => sum + (line.quantity * line.unitPrice - line.discount) * line.vatRate / 100,
      0,
    );
    const record = {
      ...old,
      ...input,
      id: recordId || localId("invoice"),
      number: String(input.number || old?.number || "Draft invoice"),
      customerId,
      customer,
      seller: data.organisation,
      kind: input.kind || old?.kind || "SIMPLIFIED",
      documentType: input.documentType || old?.documentType || "INVOICE",
      status: old?.status || "DRAFT",
      paymentStatus: old?.paymentStatus || "UNPAID",
      issueDate: String(input.issueDate || old?.issueDate || new Date().toISOString().slice(0, 10)),
      currency: "SAR",
      lines,
      notes: String(input.notes || old?.notes || ""),
      paymentTerms: String(input.paymentTerms || old?.paymentTerms || ""),
      subtotal,
      vatTotal,
      total: subtotal + vatTotal,
      paidAmount: old?.paidAmount || 0,
      badDebtAmount: old?.badDebtAmount || 0,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    } as InvoiceRecord;
    data.invoices = withRecord(data.invoices, record, id, method);
    result = record;
  } else if (resource === "expenses") {
    const old = data.expenses.find((item) => item.id === recordId);
    const amount = Number(input.total || old?.total || 0);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("expense"),
      number: String(input.number || old?.number || "Local expense"),
      vendor: String(input.vendor || old?.vendor || ""),
      category: String(input.category || old?.category || "Business"),
      expenseDate: String(input.expenseDate || old?.expenseDate || new Date().toISOString().slice(0, 10)),
      description: String(input.description || old?.description || ""),
      subtotal: Number(input.subtotal || old?.subtotal || amount),
      vatAmount: Number(input.vatAmount || old?.vatAmount || 0),
      total: amount,
      status: old?.status || "RECORDED",
      createdAt: old?.createdAt || now,
    } as ExpenseRecord;
    data.expenses = withRecord(data.expenses, record, id, method);
    result = record;
  } else if (resource === "bills") {
    const old = data.billBook.bills.find((item) => item.id === recordId);
    const total = Number(input.total || old?.total || 0);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("bill"),
      direction: input.direction || old?.direction || "PURCHASE",
      number: String(input.number || old?.number || "Local bill"),
      issueDate: String(input.issueDate || old?.issueDate || new Date().toISOString().slice(0, 10)),
      total,
      note: String(input.note || old?.note || ""),
      category: input.category || old?.category || "BUSINESS",
      status: old?.status || "DRAFT",
      paidAmount: old?.paidAmount || 0,
      offsetAmount: old?.offsetAmount || 0,
      balance: old?.balance ?? total,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    } as BillRecord;
    data.billBook.bills = withRecord(data.billBook.bills, record, id, method);
    result = record;
  } else if (resource === "payments") {
    const old = data.payments.find((item) => item.id === recordId);
    const invoice = data.invoices.find((item) => item.id === input.invoiceId);
    const record = {
      ...old,
      ...input,
      id: recordId || localId("payment"),
      invoiceId: String(input.invoiceId || old?.invoiceId || ""),
      invoiceNumber: String(input.invoiceNumber || invoice?.number || ""),
      customerName: String(input.customerName || invoice?.customer.name || ""),
      customerId: String(input.customerId || invoice?.customerId || ""),
      amount: Number(input.amount || old?.amount || 0),
      method: input.method || old?.method || "CASH",
      reference: String(input.reference || old?.reference || ""),
      paidAt: String(input.paidAt || now),
      createdAt: old?.createdAt || now,
    } as PaymentRecord;
    data.payments = withRecord(data.payments, record, id, method);
    result = record;
  } else if (resource === "car-moves") {
    if (action === "put-back" && id) {
      const move = data.carMoves.find((item) => item.id === id);
      if (move && !move.putBackAt) {
        for (const moved of move.cars) {
          const vehicle = data.vehicles.find(
            (item) => item.id === moved.vehicleId,
          );
          const customer = data.customers.find(
            (item) => item.id === moved.fromCustomerId,
          );
          if (vehicle) {
            vehicle.customerId = moved.fromCustomerId;
            vehicle.customerName = customer?.name || move.names[moved.fromCustomerId];
          }
        }
        move.putBackAt = now;
      }
      result = move;
    } else {
      const customerIds = Array.isArray(input.customerIds)
        ? input.customerIds.filter((value): value is string => typeof value === "string")
        : [];
      const destinationCustomerId = String(input.destinationCustomerId || "");
      const sourceCustomerIds = customerIds.filter(
        (customerId) => customerId !== destinationCustomerId,
      );
      const movingCars = data.vehicles.filter(
        (vehicle) => vehicle.customerId && sourceCustomerIds.includes(vehicle.customerId),
      );
      const move: CarMoveRecord = {
        id:
          (typeof input.operationId === "string" && input.operationId) ||
          localId("car-move"),
        destinationCustomerId,
        sourceCustomerIds,
        cars: movingCars.map((vehicle) => ({
          vehicleId: vehicle.id,
          fromCustomerId: vehicle.customerId || "",
        })),
        names: Object.fromEntries(
          customerIds.map((customerId) => [
            customerId,
            data.customers.find((customer) => customer.id === customerId)?.name ||
              "Customer",
          ]),
        ),
        actor: "Reference workspace",
        createdAt: now,
      };
      const destinationName =
        data.customers.find((customer) => customer.id === destinationCustomerId)?.name;
      for (const vehicle of movingCars) {
        vehicle.customerId = destinationCustomerId;
        vehicle.customerName = destinationName;
      }
      data.carMoves = [move, ...data.carMoves];
      result = move;
    }
  } else if (resource === "ledger") {
    const action = input.action;
    if (action === "confirm" && typeof input.entryId === "string") {
      const entry = data.ledger.entries.find((item) => item.id === input.entryId);
      if (entry) {
        entry.needsReview = false;
        entry.reviewedAt = now;
      }
      result = entry;
    } else if (Array.isArray(input.roles)) {
      const person = {
        ...input,
        id: recordId || localId("person"),
        name: String(input.name || "Local person"),
        roles: input.roles,
        createdAt: now,
        updatedAt: now,
        balance: 0,
        entryCount: 0,
        needsReviewCount: 0,
        confirmedBalance: 0,
      } as LedgerPerson;
      data.ledger.people = withRecord(data.ledger.people, person, id, method);
      result = person;
    } else {
      const entry = makeEntry(input, data, recordId);
      data.ledger.entries = withRecord(data.ledger.entries, entry, id, method);
      result = entry;
    }
  } else if (resource === "money-records") {
    const entryId = localId("entry");
    const entry = makeEntry(input, data, entryId);
    data.ledger.entries = [entry, ...data.ledger.entries];
    const record: MoneyEntryRecord = {
      id: localId("money"),
      direction: input.direction === "OUT" ? "OUT" : "IN",
      category: (input.category as MoneyEntryRecord["category"]) || "RANDOM_NOTE",
      amount: Number(input.amount) || 0,
      description: String(input.note || "Local money record"),
      partyName: entry.personName,
      customerId: input.personId ? String(input.personId) : undefined,
      customerName: entry.personName,
      vehicleId: entry.vehicleId,
      plateNumber: entry.plateNumber,
      paymentMethod: entry.paymentMethod,
      entryDate: entry.entryDate,
      routedTo: [],
      needsReview: false,
      attachmentCount: 0,
      createdAt: now,
    };
    data.moneyEntries = [record, ...data.moneyEntries];
    data.ledger.totals.cashIn += entry.cashIn;
    data.ledger.totals.cashOut += entry.cashOut;
    data.ledger.totals.cashChange += entry.cashChange;
    data.ledger.totals.income += entry.income;
    data.ledger.totals.businessExpense += entry.businessExpense;
    result = {
      id: record.id,
      entryId,
      entryIds: [entryId],
      personId: entry.personId,
    };
  }

  data.storage = { mode: "local", durable: true };
  return { data, result };
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const snapshot = readSnapshot();
    setData(snapshot);
    if (snapshot.storage.durable) saveSnapshot(snapshot);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async <T,>(url: string, init: RequestInit = {}) => {
      if (!data) throw new Error("The local reference workspace is loading.");
      const path = url.split("?")[0].split("/").filter(Boolean);
      const apiIndex = path.indexOf("api");
      const resource = path[apiIndex + 1] || "";
      const id = path[apiIndex + 2];
      const action = path[apiIndex + 3];
      const method = (init.method || "POST").toUpperCase();
      let input: Record<string, unknown> = {};
      if (typeof init.body === "string") {
        try {
          input = JSON.parse(init.body) as Record<string, unknown>;
        } catch {
          input = {};
        }
      }
      const { data: next, result } = changedSnapshot(
        data,
        resource,
        id,
        action,
        method,
        input,
      );
      const saved = saveSnapshot(next);
      if (!saved) {
        next.storage = { mode: "local", durable: false };
      }
      setData(next);
      setError(null);
      return result as T;
    },
    [data],
  );

  const value = useMemo(
    () => ({ data, loading, error, refresh, mutate }),
    [data, loading, error, refresh, mutate],
  );
  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

export function useProduct() {
  const value = useContext(ProductContext);
  if (!value) throw new Error("useProduct must be used inside ProductProvider");
  return value;
}

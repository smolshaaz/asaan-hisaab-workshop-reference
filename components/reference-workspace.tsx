"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  Car,
  ChartLineUp,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Users,
  Wrench,
  X,
} from "@/lib/icons";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import styles from "./reference-workspace.module.css";

type Section =
  | "today"
  | "cars"
  | "money"
  | "people"
  | "quotations"
  | "invoices"
  | "expenses"
  | "reports";

type Person = {
  id: string;
  name: string;
  role: "Customer" | "Supplier" | "Worker";
  phone: string;
  balance: number;
  since: string;
};

type Vehicle = {
  id: string;
  registration: string;
  vehicle: string;
  owner: string;
  work: string;
  status: "In progress" | "Ready for pickup" | "Waiting for parts";
  date: string;
};

type LedgerEntry = {
  id: string;
  title: string;
  person: string;
  method: string;
  date: string;
  amount: number;
  direction: "in" | "out";
};

type DocumentRecord = {
  id: string;
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: "Paid" | "Part paid" | "Unpaid" | "Draft" | "Accepted";
};

type Expense = {
  id: string;
  category: string;
  details: string;
  date: string;
  amount: number;
};

type DemoData = {
  people: Person[];
  cars: Vehicle[];
  ledger: LedgerEntry[];
  quotations: DocumentRecord[];
  invoices: DocumentRecord[];
  expenses: Expense[];
};

type AddMode =
  | "money-in"
  | "money-out"
  | "customer"
  | "vehicle"
  | "quotation"
  | "invoice"
  | "expense";

const STORAGE_KEY = "asaan-hisaab-reference-v1";
const REFERENCE_DATE = new Date("2026-10-25T12:00:00");

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOffset(offset: number, base: Date) {
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return localDate(date);
}

function makeDemoData(baseDate = REFERENCE_DATE): DemoData {
  const today = dateOffset(0, baseDate);
  return {
    people: [
      {
        id: "p-1",
        name: "Noura Al-Harbi",
        role: "Customer",
        phone: "+966 55 401 7286",
        balance: 1850,
        since: "2025-08-14",
      },
      {
        id: "p-2",
        name: "Khalid Al-Qahtani",
        role: "Customer",
        phone: "+966 54 302 9164",
        balance: 920,
        since: "2025-12-03",
      },
      {
        id: "p-3",
        name: "Riyadh Motor Parts",
        role: "Supplier",
        phone: "+966 11 438 2210",
        balance: -2360,
        since: "2024-11-22",
      },
      {
        id: "p-4",
        name: "Yousef Mansour",
        role: "Customer",
        phone: "+966 50 677 1482",
        balance: 0,
        since: "2026-04-09",
      },
      {
        id: "p-5",
        name: "Maha Al-Otaibi",
        role: "Customer",
        phone: "+966 56 283 5019",
        balance: 1275,
        since: "2026-07-17",
      },
      {
        id: "p-6",
        name: "Faisal Ahmed",
        role: "Worker",
        phone: "+966 53 185 6902",
        balance: 450,
        since: "2025-06-01",
      },
    ],
    cars: [
      {
        id: "v-1",
        registration: "RSH 4821",
        vehicle: "Toyota Camry · 2021",
        owner: "Noura Al-Harbi",
        work: "Brake pads and inspection",
        status: "In progress",
        date: today,
      },
      {
        id: "v-2",
        registration: "KSA 7194",
        vehicle: "Hyundai Tucson · 2020",
        owner: "Khalid Al-Qahtani",
        work: "Oil service",
        status: "Ready for pickup",
        date: dateOffset(-1, baseDate),
      },
      {
        id: "v-3",
        registration: "DMM 3382",
        vehicle: "Nissan Patrol · 2019",
        owner: "Maha Al-Otaibi",
        work: "A/C compressor",
        status: "Waiting for parts",
        date: dateOffset(-2, baseDate),
      },
      {
        id: "v-4",
        registration: "RUH 9056",
        vehicle: "Honda Accord · 2022",
        owner: "Yousef Mansour",
        work: "Front suspension",
        status: "In progress",
        date: dateOffset(-1, baseDate),
      },
      {
        id: "v-5",
        registration: "JED 1460",
        vehicle: "Kia Sportage · 2023",
        owner: "Noura Al-Harbi",
        work: "Battery replacement",
        status: "Ready for pickup",
        date: dateOffset(0, baseDate),
      },
      {
        id: "v-6",
        registration: "RUH 2618",
        vehicle: "Ford Ranger · 2018",
        owner: "Salman Al-Dosari",
        work: "Electrical check",
        status: "In progress",
        date: dateOffset(-3, baseDate),
      },
    ],
    ledger: [
      {
        id: "m-1",
        title: "Service payment",
        person: "Noura Al-Harbi",
        method: "Bank transfer",
        date: today,
        amount: 1450,
        direction: "in",
      },
      {
        id: "m-2",
        title: "Parts purchase",
        person: "Riyadh Motor Parts",
        method: "Cash",
        date: today,
        amount: 680,
        direction: "out",
      },
      {
        id: "m-3",
        title: "Invoice payment",
        person: "Khalid Al-Qahtani",
        method: "Card",
        date: today,
        amount: 920,
        direction: "in",
      },
      {
        id: "m-4",
        title: "Workshop supplies",
        person: "Al Waha Trading",
        method: "Cash",
        date: dateOffset(-1, baseDate),
        amount: 245,
        direction: "out",
      },
      {
        id: "m-5",
        title: "A/C repair payment",
        person: "Maha Al-Otaibi",
        method: "Bank transfer",
        date: dateOffset(-1, baseDate),
        amount: 875,
        direction: "in",
      },
      {
        id: "m-6",
        title: "Technician advance",
        person: "Faisal Ahmed",
        method: "Cash",
        date: dateOffset(-2, baseDate),
        amount: 300,
        direction: "out",
      },
      {
        id: "m-7",
        title: "Inspection and service",
        person: "Yousef Mansour",
        method: "Card",
        date: dateOffset(-3, baseDate),
        amount: 620,
        direction: "in",
      },
    ],
    quotations: [
      {
        id: "q-1",
        number: "Q-2026-041",
        customer: "Maha Al-Otaibi",
        date: dateOffset(0, baseDate),
        amount: 2450,
        status: "Accepted",
      },
      {
        id: "q-2",
        number: "Q-2026-040",
        customer: "Noura Al-Harbi",
        date: dateOffset(-1, baseDate),
        amount: 1860,
        status: "Draft",
      },
      {
        id: "q-3",
        number: "Q-2026-039",
        customer: "Yousef Mansour",
        date: dateOffset(-4, baseDate),
        amount: 920,
        status: "Accepted",
      },
      {
        id: "q-4",
        number: "Q-2026-038",
        customer: "Khalid Al-Qahtani",
        date: dateOffset(-7, baseDate),
        amount: 1320,
        status: "Draft",
      },
    ],
    invoices: [
      {
        id: "i-1",
        number: "INV-2026-128",
        customer: "Noura Al-Harbi",
        date: today,
        amount: 1450,
        status: "Part paid",
      },
      {
        id: "i-2",
        number: "INV-2026-127",
        customer: "Khalid Al-Qahtani",
        date: today,
        amount: 920,
        status: "Paid",
      },
      {
        id: "i-3",
        number: "INV-2026-126",
        customer: "Maha Al-Otaibi",
        date: dateOffset(-2, baseDate),
        amount: 1275,
        status: "Unpaid",
      },
      {
        id: "i-4",
        number: "INV-2026-125",
        customer: "Yousef Mansour",
        date: dateOffset(-4, baseDate),
        amount: 620,
        status: "Paid",
      },
      {
        id: "i-5",
        number: "INV-2026-124",
        customer: "Salman Al-Dosari",
        date: dateOffset(-8, baseDate),
        amount: 2100,
        status: "Unpaid",
      },
    ],
    expenses: [
      {
        id: "e-1",
        category: "Parts",
        details: "Brake pads · Riyadh Motor Parts",
        date: today,
        amount: 680,
      },
      {
        id: "e-2",
        category: "Supplies",
        details: "Cleaning and workshop supplies",
        date: dateOffset(-1, baseDate),
        amount: 245,
      },
      {
        id: "e-3",
        category: "Wages",
        details: "Advance · Faisal Ahmed",
        date: dateOffset(-2, baseDate),
        amount: 300,
      },
      {
        id: "e-4",
        category: "Utilities",
        details: "Electricity · October",
        date: dateOffset(-4, baseDate),
        amount: 740,
      },
    ],
  };
}

const INITIAL_DATA = makeDemoData();

const navigation = [
  [
    { id: "today", label: "Today", Icon: LayoutDashboard },
    { id: "cars", label: "Cars", Icon: Car },
    { id: "money", label: "Money book", Icon: HandCoins },
    { id: "people", label: "People", Icon: Users },
  ],
  [
    { id: "quotations", label: "Quotations", Icon: FileText },
    { id: "invoices", label: "Invoices", Icon: ReceiptText },
    { id: "expenses", label: "Expenses", Icon: ShoppingBag },
    { id: "reports", label: "Reports", Icon: ChartLineUp },
  ],
] as const;

const pageInfo: Record<Section, { title: string; description: string }> = {
  today: {
    title: "Today at the workshop",
    description: "A clear view of the work and money moving through the shop.",
  },
  cars: {
    title: "Cars & work",
    description: "Keep each vehicle, job and handover in one place.",
  },
  money: {
    title: "Money book",
    description: "A simple record of what came in and what went out.",
  },
  people: {
    title: "People",
    description:
      "Customers, suppliers and the people who keep the workshop moving.",
  },
  quotations: {
    title: "Quotations",
    description: "Give customers a clear view of the work before you begin.",
  },
  invoices: {
    title: "Invoices",
    description: "Track what has been issued and what is still to collect.",
  },
  expenses: {
    title: "Expenses",
    description: "Keep everyday workshop costs easy to find.",
  },
  reports: {
    title: "Reports",
    description:
      "A quick picture of the month, using the sample records below.",
  },
};

function isDemoData(value: unknown): value is DemoData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoData>;
  return [
    candidate.people,
    candidate.cars,
    candidate.ledger,
    candidate.quotations,
    candidate.invoices,
    candidate.expenses,
  ].every(Array.isArray);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date to add";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ReferenceWorkspace() {
  const [data, setData] = useState<DemoData>(INITIAL_DATA);
  const [section, setSection] = useState<Section>("today");
  const [todayKey, setTodayKey] = useState("2026-10-25");
  const [today, setToday] = useState("Sunday, 25 October 2026");
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const now = new Date();
    try {
      setSidebarCollapsed(
        window.localStorage.getItem("asaan-reference-sidebar-collapsed") ===
          "true",
      );
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
    setTodayKey(localDate(now));
    setToday(dateLabel(now));
    const hashSection = window.location.hash.slice(1) as Section;
    if (hashSection in pageInfo) setSection(hashSection);
    const onHashChange = () => {
      const next = window.location.hash.slice(1) as Section;
      if (next in pageInfo) setSection(next);
    };
    window.addEventListener("hashchange", onHashChange);

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isDemoData(parsed)) setData(parsed);
      } else {
        setData(makeDemoData(now));
      }
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
      setData(makeDemoData(now));
    }
    setReady(true);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!ready || storageAvailable !== true) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setStorageAvailable(false);
    }
  }, [data, ready, storageAvailable]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const setSectionFromNav = (next: Section) => {
    setSection(next);
    setMobileMenu(false);
    setSearch("");
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  };

  const toggleSidebar = () => {
    const collapsed = !sidebarCollapsed;
    setSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(
        "asaan-reference-sidebar-collapsed",
        String(collapsed),
      );
    } catch {
      // Keep the current session preference.
    }
  };

  const searchItems = useMemo(
    () => [
      ...data.people.map((item) => ({
        title: item.name,
        detail: item.role,
        section: "people" as Section,
      })),
      ...data.cars.map((item) => ({
        title: item.registration,
        detail: `${item.vehicle} · ${item.owner}`,
        section: "cars" as Section,
      })),
      ...data.invoices.map((item) => ({
        title: item.number,
        detail: `Invoice · ${item.customer}`,
        section: "invoices" as Section,
      })),
      ...data.quotations.map((item) => ({
        title: item.number,
        detail: `Quotation · ${item.customer}`,
        section: "quotations" as Section,
      })),
    ],
    [data],
  );
  const searchResults = search.trim()
    ? searchItems
        .filter((item) =>
          `${item.title} ${item.detail}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];

  const todayEntries = data.ledger.filter((entry) => entry.date === todayKey);
  const todayIn = todayEntries
    .filter((entry) => entry.direction === "in")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const todayOut = todayEntries
    .filter((entry) => entry.direction === "out")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openInvoices = data.invoices.filter(
    (invoice) => invoice.status === "Unpaid" || invoice.status === "Part paid",
  ).length;
  const visibleCars = data.cars.filter((car) =>
    matches(
      search,
      `${car.registration} ${car.vehicle} ${car.owner} ${car.work} ${car.status}`,
    ),
  );
  const visibleMoney = [...data.ledger]
    .filter((entry) =>
      matches(search, `${entry.title} ${entry.person} ${entry.method}`),
    )
    .sort(byDate);
  const visiblePeople = data.people.filter((person) =>
    matches(search, `${person.name} ${person.phone} ${person.role}`),
  );
  const visibleQuotations = data.quotations.filter((item) =>
    matches(search, `${item.number} ${item.customer} ${item.status}`),
  );
  const visibleInvoices = data.invoices.filter((item) =>
    matches(search, `${item.number} ${item.customer} ${item.status}`),
  );
  const visibleExpenses = data.expenses.filter((item) =>
    matches(search, `${item.category} ${item.details}`),
  );

  function resetDemo() {
    if (
      !window.confirm(
        "Reset this browser's sample records to the original demo?",
      )
    )
      return;
    const freshData = makeDemoData(new Date());
    setData(freshData);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
    setNotice("Sample workspace restored");
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addMode) return;
    const values = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    const name = String(values.get("name") || "").trim();
    const amount = Number(values.get("amount") || 0);
    const date = localDate(new Date());

    setData((previous) => {
      if (addMode === "customer") {
        return {
          ...previous,
          people: [
            ...previous.people,
            {
              id,
              name,
              role: String(values.get("role") || "Customer") as Person["role"],
              phone: String(values.get("phone") || "").trim(),
              balance: 0,
              since: date,
            },
          ],
        };
      }
      if (addMode === "vehicle") {
        return {
          ...previous,
          cars: [
            ...previous.cars,
            {
              id,
              registration: String(values.get("registration") || "").trim(),
              vehicle: String(values.get("vehicle") || "").trim(),
              owner: name,
              work: String(values.get("work") || "").trim(),
              status: "In progress",
              date,
            },
          ],
        };
      }
      if (addMode === "money-in" || addMode === "money-out") {
        const direction = addMode === "money-in" ? "in" : "out";
        return {
          ...previous,
          ledger: [
            ...previous.ledger,
            {
              id,
              title: String(
                values.get("details") ||
                  (direction === "in" ? "Money received" : "Money paid"),
              ).trim(),
              person: name,
              method: String(values.get("method") || "Cash"),
              date,
              amount,
              direction,
            },
          ],
        };
      }
      if (addMode === "quotation" || addMode === "invoice") {
        const isQuotation = addMode === "quotation";
        const next = {
          id,
          number: `${isQuotation ? "Q" : "INV"}-DEMO-${String(Date.now()).slice(-4)}`,
          customer: name,
          date,
          amount,
          status: isQuotation ? ("Draft" as const) : ("Unpaid" as const),
        };
        return isQuotation
          ? { ...previous, quotations: [next, ...previous.quotations] }
          : { ...previous, invoices: [next, ...previous.invoices] };
      }
      return {
        ...previous,
        expenses: [
          ...previous.expenses,
          {
            id,
            category: String(values.get("category") || "Workshop"),
            details: String(values.get("details") || "Workshop expense").trim(),
            date,
            amount,
          },
        ],
      };
    });
    const successText: Record<AddMode, string> = {
      "money-in": "Money received · saved in this browser",
      "money-out": "Money paid · saved in this browser",
      customer: "Customer added · saved in this browser",
      vehicle: "Vehicle added · saved in this browser",
      quotation: "Quotation added · saved in this browser",
      invoice: "Invoice added · saved in this browser",
      expense: "Expense added · saved in this browser",
    };
    setNotice(successText[addMode]);
    setAddMode(null);
  }

  const currentPage = pageInfo[section];

  return (
    <div
      className={`${styles.workspace} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}
    >
      <a className={styles.skipLink} href="#reference-main">
        Skip to content
      </a>
      {mobileMenu && (
        <button
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`${styles.sidebar} ${mobileMenu ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brandRow}>
          <a
            href="#today"
            className={styles.brand}
            onClick={() => setSectionFromNav("today")}
          >
            <span className={styles.brandMark}>م</span>
            <span>Asaan Hisaab</span>
          </a>
          <button
            className={`${styles.iconButton} ${styles.closeMenu}`}
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className={styles.workshopName}>Al Noor Auto Care</p>
        <nav className={styles.navigation} aria-label="Reference workspace">
          {navigation.map((group, groupIndex) => (
            <div className={styles.navGroup} key={groupIndex}>
              {group.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`${styles.navItem} ${section === id ? styles.navActive : ""}`}
                  onClick={() => setSectionFromNav(id)}
                  aria-current={section === id ? "page" : undefined}
                >
                  <Icon
                    size={22}
                    weight={section === id ? "fill" : "regular"}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                  {id === "invoices" && openInvoices > 0 && (
                    <small className={styles.navCount}>{openInvoices}</small>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.localCard}>
            <span className={styles.localDot} />
            <span>
              <strong>
                {storageAvailable === false
                  ? "Session preview"
                  : "Saved in this browser"}
              </strong>
              <small>
                {storageAvailable === false
                  ? "Changes may not be saved"
                  : "No shared records or database"}
              </small>
            </span>
          </div>
          <button className={styles.resetLink} onClick={resetDemo}>
            <Activity size={17} /> Restore sample workspace
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={`${styles.iconButton} ${styles.desktopMenuButton}`}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Open sidebar" : "Hide sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            <Menu size={23} />
          </button>
          <button
            className={`${styles.iconButton} ${styles.menuButton}`}
            onClick={() => setMobileMenu(true)}
            aria-label="Open navigation"
          >
            <span className={styles.menuGlyph}>
              <i />
              <i />
              <i />
            </span>
          </button>
          <div className={styles.searchWrap}>
            <Search size={19} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setSearch("")}
              placeholder="Find a car, person or document"
              aria-label="Search demo records"
            />
            {search && (
              <button
                className={styles.searchClear}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
            {search.trim() && (
              <div className={styles.searchResults}>
                {searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      key={`${result.section}-${result.title}`}
                      onClick={() => setSectionFromNav(result.section)}
                    >
                      <strong>{result.title}</strong>
                      <small>{result.detail}</small>
                    </button>
                  ))
                ) : (
                  <p>No matching sample records</p>
                )}
              </div>
            )}
          </div>
          <div className={styles.topbarRight}>
            <button
              aria-label="New record"
              className={styles.primaryButton}
              onClick={() =>
                setAddMode(
                  section === "people"
                    ? "customer"
                    : section === "cars"
                      ? "vehicle"
                      : section === "quotations"
                        ? "quotation"
                        : section === "invoices"
                          ? "invoice"
                          : section === "expenses"
                            ? "expense"
                            : "money-in",
                )
              }
            >
              <Plus size={18} /> <span>Add record</span>
            </button>
          </div>
        </header>

        <main
          className={`${styles.content} ${section === "today" ? styles.dailyContent : ""}`}
          id="reference-main"
          tabIndex={-1}
        >

          {section === "today" ? (
            <Dashboard
              data={data}
              today={today}
              todayIn={todayIn}
              todayOut={todayOut}
              onAdd={setAddMode}
              onNavigate={setSectionFromNav}
            />
          ) : (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <p className={styles.pageDate}>{today}</p>
                  <h1>{currentPage.title}</h1>
                  <p>{currentPage.description}</p>
                </div>
                <div className={styles.pageActions}>
                  {section === "money" && (
                    <>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => setAddMode("money-out")}
                      >
                        <ArrowUpRight size={17} /> Money paid
                      </button>
                      <button
                        className={styles.primaryButton}
                        onClick={() => setAddMode("money-in")}
                      >
                        <ArrowDownRight size={17} /> Money received
                      </button>
                    </>
                  )}
                  {section === "people" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => setAddMode("customer")}
                    >
                      <Plus size={18} /> Add person
                    </button>
                  )}
                  {section === "cars" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => setAddMode("vehicle")}
                    >
                      <Plus size={18} /> Add vehicle
                    </button>
                  )}
                  {section === "quotations" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => setAddMode("quotation")}
                    >
                      <Plus size={18} /> New quotation
                    </button>
                  )}
                  {section === "invoices" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => setAddMode("invoice")}
                    >
                      <Plus size={18} /> New invoice
                    </button>
                  )}
                  {section === "expenses" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => setAddMode("expense")}
                    >
                      <Plus size={18} /> Add expense
                    </button>
                  )}
                </div>
              </div>
              {section === "cars" && <CarsTable cars={visibleCars} />}
              {section === "money" && <MoneyTable entries={visibleMoney} />}
              {section === "people" && <PeopleList people={visiblePeople} />}
              {section === "quotations" && (
                <DocumentsTable items={visibleQuotations} label="Quotation" />
              )}
              {section === "invoices" && (
                <DocumentsTable items={visibleInvoices} label="Invoice" />
              )}
              {section === "expenses" && (
                <ExpensesTable expenses={visibleExpenses} />
              )}
              {section === "reports" && (
                <Reports data={data} todayKey={todayKey} />
              )}
            </>
          )}
        </main>
      </div>

      <nav className={styles.mobileNav} aria-label="Quick navigation">
        {navigation[0].map(({ id, label, Icon }) => (
          <button
            key={id}
            className={section === id ? styles.mobileNavActive : ""}
            onClick={() => setSectionFromNav(id)}
          >
            <Icon size={20} weight={section === id ? "fill" : "regular"} />
            <span>
              {label === "Money book"
                ? "Money"
                  : label}
            </span>
          </button>
        ))}
        <button onClick={() => setMobileMenu(true)}>
          <Settings size={20} />
          <span>More</span>
        </button>
      </nav>

      {addMode && (
        <AddRecordDialog
          mode={addMode}
          onClose={() => setAddMode(null)}
          onSubmit={addRecord}
        />
      )}
      <div
        className={styles.toast}
        role="status"
        aria-live="polite"
        data-visible={Boolean(notice)}
      >
        {notice}
      </div>
    </div>
  );
}

function matches(query: string, value: string) {
  return (
    !query.trim() || value.toLowerCase().includes(query.trim().toLowerCase())
  );
}

function byDate<T extends { date: string }>(left: T, right: T) {
  return right.date.localeCompare(left.date);
}

function Dashboard({
  data,
  today,
  todayIn,
  todayOut,
  onAdd,
  onNavigate,
}: {
  data: DemoData;
  today: string;
  todayIn: number;
  todayOut: number;
  onAdd: (mode: AddMode) => void;
  onNavigate: (section: Section) => void;
}) {
  const recent = [...data.ledger].sort(byDate).slice(0, 5);
  const difference = todayIn - todayOut;
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>Today at the workshop</h1>
          <p>{today} · Record it while you remember.</p>
        </div>
      </div>
      <div className={`${styles.quickActions} ${styles.todayPrimaryActions}`}>
        <button
          className={`${styles.actionCard} ${styles.actionIn}`}
          onClick={() => onAdd("money-in")}
        >
          <ArrowDownRight size={32} />
          <span className={styles.actionCopy}>
            <strong>Money received</strong>
            <small>Someone paid or returned money</small>
          </span>
        </button>
        <button
          className={`${styles.actionCard} ${styles.actionOut}`}
          onClick={() => onAdd("money-out")}
        >
          <ArrowUpRight size={32} />
          <span className={styles.actionCopy}>
            <strong>Money paid</strong>
            <small>Bought something or gave money</small>
          </span>
        </button>
      </div>
      <div className={styles.todayQuickLinks}>
        <button onClick={() => onNavigate("cars")}>
          <Car size={23} /> <span>Cars & work</span>
        </button>
        <button onClick={() => onNavigate("quotations")}>
          <FileText size={23} /> <span>Make quotation</span>
        </button>
        <button onClick={() => onNavigate("invoices")}>
          <ReceiptText size={23} /> <span>Make invoice</span>
        </button>
      </div>
      <section className={styles.todayMoney}>
        <div className={styles.sectionTitle}>
          <h2>Today’s money</h2>
          <button className={styles.textLink} onClick={() => onNavigate("money")}>
            Full history <ArrowRight size={16} />
          </button>
        </div>
        <div className={styles.todayMoneyNumbers}>
          <div>
            <span>Came in</span>
            <strong>{currency(todayIn)}</strong>
          </div>
          <div>
            <span>Went out</span>
            <strong>{currency(todayOut)}</strong>
          </div>
          <div>
            <span>{difference < 0 ? "More went out" : "Difference"}</span>
            <strong>{currency(Math.abs(difference))}</strong>
          </div>
        </div>
        <p>
          Recorded money movement. This does not tell us the profit or how much
          cash is in the drawer.
        </p>
      </section>
      <section className={styles.latestRecords}>
        <div className={styles.sectionTitle}>
          <h2>Latest records</h2>
          <button className={styles.textLink} onClick={() => onNavigate("money")}>
            See all <ArrowRight size={16} />
          </button>
        </div>
        <div className={styles.dailyHistory}>
          {recent.map((entry) => (
            <MoneyRow key={entry.id} entry={entry} compact />
          ))}
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className={styles.statCard}>
      <span className={`${styles.statIcon} ${styles[`tone_${tone}`]}`}>
        {icon}
      </span>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function WeeklyChart({
  entries,
  todayKey,
}: {
  entries: LedgerEntry[];
  todayKey: string;
}) {
  const latest = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${todayKey}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    const key = localDate(date);
    const dayEntries = entries.filter((entry) => entry.date === key);
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(
        date,
      ),
      income: dayEntries
        .filter((entry) => entry.direction === "in")
        .reduce((sum, entry) => sum + entry.amount, 0),
      expense: dayEntries
        .filter((entry) => entry.direction === "out")
        .reduce((sum, entry) => sum + entry.amount, 0),
    };
  });
  const max = Math.max(
    1,
    ...latest.flatMap((day) => [day.income, day.expense]),
  );
  return (
    <div
      className={styles.chart}
      role="img"
      aria-label="Bar chart showing money in and out for the last seven days"
    >
      <div className={styles.chartLines}>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={styles.chartBars}>
        {latest.map((day) => (
          <div
            className={styles.chartDay}
            key={day.key}
            aria-label={`${day.label}: ${currency(day.income)} in, ${currency(day.expense)} out`}
          >
            <div className={styles.barPair}>
              <span
                className={styles.barIn}
                style={{
                  height: `${Math.max(day.income ? 6 : 0, (day.income / max) * 100)}%`,
                }}
              />
              <span
                className={styles.barOut}
                style={{
                  height: `${Math.max(day.expense ? 6 : 0, (day.expense / max) * 100)}%`,
                }}
              />
            </div>
            <small>{day.label.slice(0, 1)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoneyRow({
  entry,
  compact = false,
}: {
  entry: LedgerEntry;
  compact?: boolean;
}) {
  return (
    <div
      className={`${styles.moneyRow} ${compact ? styles.moneyRowCompact : ""}`}
    >
      <span
        className={`${styles.moneyMark} ${entry.direction === "in" ? styles.moneyMarkIn : styles.moneyMarkOut}`}
      >
        {entry.direction === "in" ? (
          <ArrowDownRight size={18} />
        ) : (
          <ArrowUpRight size={18} />
        )}
      </span>
      <span className={styles.moneyDescription}>
        <strong>{entry.title}</strong>
        <small>
          {entry.person} · {entry.method}
        </small>
      </span>
      <span className={styles.moneyDate}>{formatDate(entry.date)}</span>
      <strong
        className={`${styles.moneyAmount} ${entry.direction === "in" ? styles.amountIn : styles.amountOut}`}
      >
        {entry.direction === "in" ? "+" : "−"}
        {currency(entry.amount)}
      </strong>
    </div>
  );
}

function CarsTable({ cars }: { cars: Vehicle[] }) {
  if (!cars.length)
    return (
      <EmptyState
        title="No cars match that search"
        detail="Try a registration, model or customer name."
      />
    );
  return (
    <div className={styles.tablePanel}>
      <div className={styles.tableToolbar}>
        <span>{cars.length} vehicles</span>
        <span className={styles.tableToolbarHint}>
          Sample workshop register
        </span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Work requested</th>
              <th>Arrived</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr key={car.id}>
                <td>
                  <strong>{car.vehicle}</strong>
                  <small className={styles.cellSub}>{car.registration}</small>
                </td>
                <td>{car.owner}</td>
                <td>{car.work}</td>
                <td>{formatDate(car.date)}</td>
                <td>
                  <StatusBadge status={car.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoneyTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length)
    return (
      <EmptyState
        title="No money records match"
        detail="Try another search, or add a local sample record."
      />
    );
  const totalIn = entries
    .filter((entry) => entry.direction === "in")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalOut = entries
    .filter((entry) => entry.direction === "out")
    .reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <>
      <div className={styles.summaryStrip}>
        <div>
          <span>Money in</span>
          <strong className={styles.amountIn}>{currency(totalIn)}</strong>
        </div>
        <div>
          <span>Money out</span>
          <strong className={styles.amountOut}>{currency(totalOut)}</strong>
        </div>
        <div>
          <span>Difference</span>
          <strong>{currency(totalIn - totalOut)}</strong>
        </div>
      </div>
      <div className={styles.tablePanel}>
        <div className={styles.tableToolbar}>
          <span>{entries.length} entries</span>
          <span className={styles.tableToolbarHint}>
            Sample records are saved only in this browser
          </span>
        </div>
        <div className={styles.activityList}>
          {entries.map((entry) => (
            <MoneyRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </>
  );
}

function PeopleList({ people }: { people: Person[] }) {
  if (!people.length)
    return (
      <EmptyState
        title="No people match that search"
        detail="Add a customer or clear your search to see the sample list."
      />
    );
  return (
    <div className={styles.peopleGrid}>
      {people.map((person) => (
        <article className={styles.personCard} key={person.id}>
          <span className={styles.personAvatar}>{initials(person.name)}</span>
          <div className={styles.personIdentity}>
            <strong>{person.name}</strong>
            <small>
              {person.role} · {person.phone || "Phone not added"}
            </small>
          </div>
          <span
            className={`${styles.personBalance} ${person.balance < 0 ? styles.amountOut : person.balance > 0 ? styles.amountIn : ""}`}
          >
            <small>
              {person.balance < 0
                ? "We owe"
                : person.balance > 0
                  ? "To collect"
                  : "Balance"}
            </small>
            <strong>{currency(Math.abs(person.balance))}</strong>
          </span>
          <span className={styles.personSince}>
            Since {formatDate(person.since)}
          </span>
        </article>
      ))}
    </div>
  );
}

function DocumentsTable({
  items,
  label,
}: {
  items: DocumentRecord[];
  label: string;
}) {
  if (!items.length)
    return (
      <EmptyState
        title={`No ${label.toLowerCase()}s match`}
        detail="Try another search or add a sample document."
      />
    );
  return (
    <div className={styles.tablePanel}>
      <div className={styles.tableToolbar}>
        <span>
          {items.length} {label.toLowerCase()}
          {items.length === 1 ? "" : "s"}
        </span>
        <span className={styles.tableToolbarHint}>
          Example records · not tax documents
        </span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.number}</strong>
                </td>
                <td>{item.customer}</td>
                <td>{formatDate(item.date)}</td>
                <td>
                  <strong>{currency(item.amount)}</strong>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  if (!expenses.length)
    return (
      <EmptyState
        title="No expenses match"
        detail="Try another search or add an example expense."
      />
    );
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <>
      <div className={styles.summaryStrip}>
        <div>
          <span>Expenses shown</span>
          <strong>{currency(total)}</strong>
        </div>
        <div>
          <span>Records</span>
          <strong>{expenses.length}</strong>
        </div>
        <div>
          <span>Most common</span>
          <strong>{topCategory(expenses)}</strong>
        </div>
      </div>
      <div className={styles.tablePanel}>
        <div className={styles.tableToolbar}>
          <span>Recent expenses</span>
          <span className={styles.tableToolbarHint}>Demo records only</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Details</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={styles.categoryTag}>{item.category}</span>
                  </td>
                  <td>{item.details}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <strong>{currency(item.amount)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Reports({ data, todayKey }: { data: DemoData; todayKey: string }) {
  const collected = data.ledger
    .filter((entry) => entry.direction === "in")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const spent = data.ledger
    .filter((entry) => entry.direction === "out")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expensesByCategory = data.expenses.reduce<Record<string, number>>(
    (totals, item) => ({
      ...totals,
      [item.category]: (totals[item.category] || 0) + item.amount,
    }),
    {},
  );
  const categories = Object.entries(expensesByCategory).sort(
    (a, b) => b[1] - a[1],
  );
  const max = Math.max(1, ...categories.map(([, amount]) => amount));
  return (
    <div className={styles.reportGrid}>
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>Weekly money movement</h2>
            <p>Based on sample money book entries</p>
          </div>
        </div>
        <WeeklyChart entries={data.ledger} todayKey={todayKey} />
        <div className={styles.reportTotals}>
          <span>
            <small>Recorded in</small>
            <strong className={styles.amountIn}>{currency(collected)}</strong>
          </span>
          <span>
            <small>Recorded out</small>
            <strong className={styles.amountOut}>{currency(spent)}</strong>
          </span>
          <span>
            <small>Difference</small>
            <strong>{currency(collected - spent)}</strong>
          </span>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>Workshop costs</h2>
            <p>Where this sample’s expenses went</p>
          </div>
        </div>
        <div className={styles.categoryList}>
          {categories.map(([category, amount]) => (
            <div className={styles.categoryRow} key={category}>
              <div>
                <span>{category}</span>
                <strong>{currency(amount)}</strong>
              </div>
              <div className={styles.categoryTrack}>
                <i style={{ width: `${Math.max(4, (amount / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={`${styles.panel} ${styles.reportCallout}`}>
        <span>
          <ChartLineUp size={22} />
        </span>
        <div>
          <h2>A clearer month, at a glance</h2>
          <p>
            Simple summaries make it easier to spot what is owed, what has been
            collected and where workshop money is going.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(" ", "-");
  return (
    <span
      className={`${styles.statusBadge} ${styles[`status_${normalized}`] || ""}`}
    >
      <i />
      {status}
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.emptyState}>
      <span>
        <Search size={20} />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function topCategory(expenses: Expense[]) {
  const totals = expenses.reduce<Record<string, number>>(
    (sum, item) => ({
      ...sum,
      [item.category]: (sum[item.category] || 0) + item.amount,
    }),
    {},
  );
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

function AddRecordDialog({
  mode,
  onClose,
  onSubmit,
}: {
  mode: AddMode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isMoney = mode === "money-in" || mode === "money-out";
  const isDocument = mode === "quotation" || mode === "invoice";
  const title: Record<AddMode, string> = {
    "money-in": "Money received",
    "money-out": "Money paid",
    customer: "Add a person",
    vehicle: "Add a vehicle",
    quotation: "New quotation",
    invoice: "New invoice",
    expense: "Add an expense",
  };
  const description: Record<AddMode, string> = {
    "money-in": "This sample entry will be saved in this browser only.",
    "money-out": "This sample entry will be saved in this browser only.",
    customer: "Add a sample contact to this reference workspace.",
    vehicle: "Add a sample vehicle to the workshop list.",
    quotation: "Create a local example quotation record.",
    invoice: "Create a local example invoice record.",
    expense: "Add a local example workshop cost.",
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-record-title"
      >
        <div className={styles.modalHeading}>
          <div>
            <span className={styles.modalIcon}>
              {isMoney ? (
                <HandCoins size={21} />
              ) : isDocument ? (
                <FileText size={21} />
              ) : mode === "vehicle" ? (
                <Car size={21} />
              ) : mode === "expense" ? (
                <ShoppingBag size={21} />
              ) : (
                <Users size={21} />
              )}
            </span>
            <span>
              <h2 id="add-record-title">{title[mode]}</h2>
              <p>{description[mode]}</p>
            </span>
          </div>
          <button
            className={styles.iconButton}
            aria-label="Close form"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className={styles.form}>
          {mode === "customer" && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="e.g. Samira Al-Hassan"
                />
              </label>
              <label>
                Phone number
                <input name="phone" type="tel" placeholder="+966 5X XXX XXXX" />
              </label>
              <label>
                Record type
                <select name="role">
                  <option>Customer</option>
                  <option>Supplier</option>
                  <option>Worker</option>
                </select>
              </label>
            </>
          )}
          {mode === "vehicle" && (
            <>
              <div className={styles.formRow}>
                <label>
                  Registration
                  <input
                    name="registration"
                    autoFocus
                    required
                    placeholder="RUH 0000"
                  />
                </label>
                <label>
                  Customer
                  <input name="name" required placeholder="Customer name" />
                </label>
              </div>
              <label>
                Vehicle
                <input
                  name="vehicle"
                  required
                  placeholder="Make, model and year"
                />
              </label>
              <label>
                Work requested
                <input name="work" required placeholder="e.g. Oil service" />
              </label>
            </>
          )}
          {isMoney && (
            <>
              <label>
                Person or supplier
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="Who was this with?"
                />
              </label>
              <label>
                What was it for?
                <input
                  name="details"
                  placeholder={
                    mode === "money-in" ? "Service payment" : "Parts purchase"
                  }
                />
              </label>
              <div className={styles.formRow}>
                <label>
                  Amount (SAR)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    autoFocus={false}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  Payment method
                  <select name="method">
                    <option>Cash</option>
                    <option>Bank transfer</option>
                    <option>Card</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
            </>
          )}
          {isDocument && (
            <>
              <label>
                Customer
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="Customer name"
                />
              </label>
              <label>
                Amount (SAR)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </label>
            </>
          )}
          {mode === "expense" && (
            <>
              <label>
                Expense category
                <select name="category">
                  <option>Parts</option>
                  <option>Supplies</option>
                  <option>Wages</option>
                  <option>Utilities</option>
                  <option>Rent</option>
                  <option>Workshop</option>
                </select>
              </label>
              <label>
                Details
                <input
                  name="details"
                  autoFocus
                  required
                  placeholder="What was purchased?"
                />
              </label>
              <label>
                Amount (SAR)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </label>
            </>
          )}
          <div className={styles.formFootnote}>
            <Check size={15} /> Nothing here is sent to the live workshop or a
            database.
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              <Plus size={17} /> Save sample record
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Car,
  ChartBar,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  Users,
  X,
} from "@/lib/icons";
import {
  helpTopics,
  quickTour,
  topicForPath,
  type HelpStep,
  HELP_OPEN_EVENT,
} from "@/lib/help-guide";
import { useProduct } from "./product-context";
import styles from "./workshop-help.module.css";

const STORAGE_KEY = "asaan-workshop-guide-v2";
const guides = [quickTour, ...helpTopics];
type Progress = {
  topicId: string;
  step: number;
  completed: string[];
  finished?: boolean;
};
type View = "menu" | "lesson" | "done";
type Highlight = { top: number; left: number; width: number; height: number };
type Destination = { route: string; target: string; note?: string };
type Workspace = ReturnType<typeof useProduct>["data"];

function destinationFor(
  step: HelpStep,
  path: string,
  data: Workspace,
): Destination {
  const destination = {
    route: step.route,
    target: step.target || "workspace-main",
  };
  if (
    [
      "car-work",
      "car-bill",
      "car-edit",
      "car-money-actions",
      "car-documents",
      "car-supplier-bills",
      "car-cost-summary",
      "car-costs",
    ].includes(destination.target)
  ) {
    if (/^\/cars\/[^/]+$/.test(path)) return { ...destination, route: path };
    if (data?.vehicles[0])
      return { ...destination, route: `/cars/${data.vehicles[0].id}` };
    return {
      route: "/cars",
      target: "cars-add",
      note: "After you save a car, its work and bills appear inside it. For now, this is where you start.",
    };
  }
  if (
    [
      "person-balance",
      "person-customer-invoices",
      "person-history",
      "person-account-records",
    ].includes(destination.target)
  ) {
    if (/^\/people\/[^/]+$/.test(path)) return { ...destination, route: path };
    if (data?.ledger.people[0])
      return { ...destination, route: `/people/${data.ledger.people[0].id}` };
    return {
      route: "/people",
      target: "people-add",
      note: "No people saved yet. Add a person here when you are ready.",
    };
  }
  if (["bill-detail", "bill-settlements"].includes(destination.target)) {
    if (/^\/bills\/[^/]+$/.test(path) && path !== "/bills/new")
      return { ...destination, route: path };
    const bill =
      data?.billBook.bills.find(
        (item) => item.direction === "PURCHASE" && item.status === "POSTED",
      ) || data?.billBook.bills[0];
    if (bill) return { ...destination, route: `/bills/${bill.id}` };
    return {
      route: "/bills",
      target: "bills-actions",
      note: "No bills saved yet. Save a supplier bill here first; its payments and offsets will be inside that record.",
    };
  }
  if (["invoice-actions", "invoice-tabs"].includes(destination.target)) {
    if (
      /^\/invoices\/[^/]+$/.test(path) &&
      !["/invoices/new", "/invoices/record"].includes(path)
    )
      return { ...destination, route: path };
    if (data?.invoices[0])
      return { ...destination, route: `/invoices/${data.invoices[0].id}` };
    return {
      route: "/invoices",
      target: "invoices-actions",
      note: "Save an invoice first. Its own page will contain these controls.",
    };
  }
  if (destination.target === "quotation-actions") {
    if (/^\/quotations\/[^/]+$/.test(path) && path !== "/quotations/new")
      return { ...destination, route: path };
    if (data?.quotations[0])
      return { ...destination, route: `/quotations/${data.quotations[0].id}` };
    return {
      route: "/quotations",
      target: "quotations-list",
      note: "Save a quotation first. Open it from this list to use these controls.",
    };
  }
  return destination;
}

function findTarget(key: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[data-help="${key}"]`),
  ).find((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.left < window.innerWidth &&
      getComputedStyle(element).visibility !== "hidden"
    );
  });
}

function TopicIcon({ name }: { name: string }) {
  const Icon =
    (
      {
        BookOpen,
        LayoutDashboard,
        Car,
        HandCoins,
        Users,
        ReceiptText,
        FileText,
        ArrowRight,
        ChartBar,
        Settings,
      } as Record<string, typeof Car>
    )[name] || BookOpen;
  return <Icon size={21} aria-hidden="true" />;
}

export function WorkshopHelp() {
  const path = usePathname();
  const router = useRouter();
  const { data } = useProduct();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [locating, setLocating] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);
  const [coachBottom, setCoachBottom] = useState<number>();
  const [pending, setPending] = useState<Progress | null>(null);
  const [epoch, setEpoch] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);
  const dirty = useRef(false);
  const topic =
    guides.find((entry) => entry.id === progress?.topicId) || quickTour;
  const stepIndex = Math.min(progress?.step || 0, topic.steps.length - 1);
  const step = topic.steps[stepIndex];
  const completed = progress?.completed || [];
  const currentTopic = helpTopics.find(
    (entry) => entry.id === topicForPath(path),
  );
  const isLesson = open && view === "lesson";
  const filteredTopics = helpTopics.filter((entry) =>
    [
      entry.title,
      entry.description,
      ...entry.steps.map((item) => `${item.title} ${item.body}`),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const known = guides.find((entry) => entry.id === saved?.topicId);
      if (known && Number.isInteger(saved.step))
        setProgress({
          topicId: known.id,
          step: Math.max(0, Math.min(saved.step, known.steps.length - 1)),
          finished: saved.finished === true,
          completed: Array.isArray(saved.completed)
            ? guides
                .filter((entry) => saved.completed.includes(entry.id))
                .map((entry) => entry.id)
            : [],
        });
    } catch {
      /* Replay and progress still work for this session. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded && progress) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        /* Storage may be blocked. */
      }
    }
  }, [loaded, progress]);
  useEffect(() => {
    dirty.current = false;
  }, [path]);
  useEffect(() => {
    function noteEdit(event: Event) {
      const element = event.target;
      if (
        element instanceof HTMLElement &&
        !panel.current?.contains(element) &&
        element.closest(
          'form, [data-help="invoice-editor"], [data-help="quotation-editor"], [data-help="organisation-form"], [data-help="bill-editor"]',
        )
      )
        dirty.current = true;
    }
    document.addEventListener("input", noteEdit, true);
    document.addEventListener("change", noteEdit, true);
    return () => {
      document.removeEventListener("input", noteEdit, true);
      document.removeEventListener("change", noteEdit, true);
    };
  }, []);
  useEffect(() => {
    if (open) {
      heading.current?.focus({ preventScroll: true });
      body.current?.scrollTo({ top: 0 });
    }
  }, [open, view, step.id]);

  // Each step waits for its actual destination to render, then finds and frames
  // the control. Never click a Save button or manufacture a business record.
  useEffect(() => {
    if (!isLesson || !destination) {
      setHighlight(null);
      return;
    }
    const activeDestination = destination;
    let frame = 0;
    let aligned = false;
    let cancelled = false;
    const started = Date.now();
    const matchesRoute = () =>
      window.location.pathname + window.location.search ===
      activeDestination.route;
    function measure() {
      if (cancelled) return;
      if (!matchesRoute()) {
        if (Date.now() - started >= 5000) {
          setLocating(false);
          setTargetMissing(true);
        }
        return;
      }
      const found = findTarget(activeDestination.target);
      const target =
        found ||
        (Date.now() - started >= 5000
          ? document.querySelector<HTMLElement>("#workspace-main h1")
          : null);
      if (!target) {
        if (Date.now() - started >= 5000) {
          setLocating(false);
          setTargetMissing(true);
        }
        return;
      }
      const coach = panel.current;
      if (!aligned) {
        aligned = true;
        // Avoid mounting form autoFocus opening a keyboard over the tour.
        heading.current?.focus({ preventScroll: true });
        if (!target.closest(".sidebar, .topbar, .mobile-bottom-nav")) {
          target.scrollIntoView({ block: "start", behavior: "instant" });
          window.scrollBy({ top: -96, behavior: "instant" });
        }
      }
      const rect = target.getBoundingClientRect();
      const mobile = window.innerWidth <= 820;
      const baseBottom = mobile ? 84 : 22;
      const coachHeight = coach?.offsetHeight || 220;
      const coachLeft = coach?.getBoundingClientRect().left || 0;
      const defaultTop = window.innerHeight - baseBottom - coachHeight;
      // Sticky save bars and phone navigation cannot be scrolled to the top.
      // Lift the coach above them instead of hiding the control being explained.
      const overlaps =
        rect.bottom > defaultTop - 12 &&
        rect.right > coachLeft &&
        rect.top > coachHeight + 22;
      const bottom = overlaps ? window.innerHeight - rect.top + 12 : undefined;
      setCoachBottom((previous) => (previous === bottom ? previous : bottom));
      const left = Math.max(5, rect.left - 6);
      const top = Math.max(5, rect.top - 6);
      const visibleBottom =
        rect.height > window.innerHeight / 2
          ? Math.max(top + 48, defaultTop - 14)
          : window.innerHeight - 5;
      const next = {
        top,
        left,
        width: Math.max(
          0,
          Math.min(window.innerWidth - 5, rect.right + 6) - left,
        ),
        height: Math.max(0, Math.min(visibleBottom, rect.bottom + 6) - top),
      };
      setHighlight((previous) =>
        previous &&
        Object.keys(next).every(
          (key) =>
            Math.abs(
              previous[key as keyof Highlight] - next[key as keyof Highlight],
            ) < 1,
        )
          ? previous
          : next,
      );
      setLocating(false);
      setTargetMissing(!found);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const observer = new MutationObserver(schedule);
    const main = document.getElementById("workspace-main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    const sizes = new ResizeObserver(schedule);
    if (panel.current) sizes.observe(panel.current);
    if (main) sizes.observe(main);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const deadline = window.setTimeout(schedule, 5100);
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizes.disconnect();
      window.clearTimeout(deadline);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [isLesson, destination, epoch, path]);

  function activate(next: Progress) {
    const guide =
      guides.find((entry) => entry.id === next.topicId) || quickTour;
    const nextStep = guide.steps[next.step];
    const plan = destinationFor(nextStep, path, data);
    const changesScreen =
      window.location.pathname + window.location.search !== plan.route;
    dirty.current = changesScreen ? false : dirty.current;
    setPending(null);
    setProgress(next);
    setDestination(plan);
    setHighlight(null);
    setCoachBottom(undefined);
    setTargetMissing(false);
    setLocating(true);
    setEpoch((value) => value + 1);
    setOpen(true);
    setView("lesson");
    if (changesScreen) router.push(plan.route, { scroll: false });
  }
  function go(next: Progress) {
    const guide =
      guides.find((entry) => entry.id === next.topicId) || quickTour;
    const route = destinationFor(guide.steps[next.step], path, data).route;
    if (
      dirty.current &&
      window.location.pathname + window.location.search !== route
    ) {
      setPending(next);
      return;
    }
    activate(next);
  }
  function start(topicId: string) {
    go({ topicId, step: 0, completed });
  }
  // Re-registered each render so it always uses the current progress.
  useEffect(() => {
    function openStep(event: Event) {
      const { topicId, stepId } =
        (event as CustomEvent<{ topicId: string; stepId?: string }>).detail ||
        {};
      const guide = guides.find((entry) => entry.id === topicId);
      if (!guide) return;
      const step = guide.steps.findIndex((entry) => entry.id === stepId);
      go({ topicId: guide.id, step: Math.max(step, 0), completed });
    }
    window.addEventListener(HELP_OPEN_EVENT, openStep);
    return () => window.removeEventListener(HELP_OPEN_EVENT, openStep);
  });
  function next() {
    if (stepIndex < topic.steps.length - 1)
      go({ topicId: topic.id, step: stepIndex + 1, completed });
    else {
      setProgress({
        topicId: topic.id,
        step: stepIndex,
        completed: Array.from(new Set([...completed, topic.id])),
        finished: true,
      });
      setView("done");
      setPending(null);
    }
  }
  function close() {
    setOpen(false);
    setPending(null);
    setCoachBottom(undefined);
    requestAnimationFrame(() => bubble.current?.focus());
  }
  const leaveNotice = pending && (
    <div className={styles.leaveNotice} role="alert">
      <strong>Save your changes before moving on.</strong>
      <p>
        You edited this screen. Keep your work, or leave it and continue the
        tour.
      </p>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => setPending(null)}
      >
        Stay here
      </button>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => {
          dirty.current = false;
          activate(pending);
        }}
      >
        Leave and continue <ArrowRight size={16} />
      </button>
    </div>
  );

  return (
    <>
      {isLesson && highlight && (
        <div
          className={styles.focusRing}
          style={highlight}
          aria-hidden="true"
        />
      )}
      {open && (
        <div
          ref={panel}
          id="workshop-help"
          className={`${styles.panel} ${isLesson ? styles.coach : ""}`}
          style={
            isLesson && coachBottom !== undefined
              ? { bottom: coachBottom }
              : undefined
          }
          role="dialog"
          aria-modal="false"
          aria-labelledby="workshop-help-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className={styles.header}>
            {view === "menu" ? (
              <span className={styles.headerLabel}>
                <BookOpen size={20} /> Help when you need it
              </span>
            ) : (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setView("menu");
                  setPending(null);
                  setCoachBottom(undefined);
                }}
              >
                <ArrowLeft size={18} /> Other help
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Pause and close help"
              title="Pause and close help"
              onClick={close}
            >
              <X size={21} />
            </button>
          </header>
          <div ref={body} className={styles.body}>
            {view === "menu" && (
              <>
                <h2 id="workshop-help-title" ref={heading} tabIndex={-1}>
                  Let’s show you around.
                </h2>
                <p className={styles.intro}>
                  Just 10 stops. We’ll take you to each screen and point out
                  what to use.
                </p>
                {progress && !progress.finished && (
                  <button
                    type="button"
                    className={styles.resume}
                    onClick={() => go({ ...progress, finished: false })}
                  >
                    <span>
                      <strong>Continue my tour</strong>
                      <small>
                        {topic.title} · {stepIndex + 1} of {topic.steps.length}
                      </small>
                    </span>
                    <ArrowRight size={20} />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => start(quickTour.id)}
                >
                  <BookOpen size={19} />{" "}
                  {progress?.topicId === quickTour.id
                    ? "Restart the 10-step tour"
                    : "Start the 10-step tour"}
                  <ArrowRight size={19} />
                </button>
                <p className={styles.reassurance}>
                  You only need Next. Close any time and come back here.
                </p>
                {leaveNotice}
                {currentTopic && (
                  <button
                    type="button"
                    className={styles.currentScreen}
                    onClick={() => start(currentTopic.id)}
                  >
                    <CircleHelp size={21} />
                    <span>
                      <strong>Help with this screen</strong>
                      <small>
                        {currentTopic.title} · {currentTopic.steps.length} steps
                      </small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                )}
                <details className={styles.moreDetails}>
                  <summary>Help with a specific task</summary>
                  <label className={styles.search}>
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search guides"
                      aria-label="Find a guide"
                      type="search"
                    />
                  </label>
                  <div className={styles.topics}>
                    {filteredTopics.map((entry) => (
                      <button
                        type="button"
                        key={entry.id}
                        className={styles.topic}
                        onClick={() => start(entry.id)}
                      >
                        <span className={styles.topicIcon}>
                          <TopicIcon name={entry.icon} />
                        </span>
                        <span>
                          <strong>{entry.title}</strong>
                          <small>{entry.steps.length} short steps</small>
                        </span>
                        {completed.includes(entry.id) ? (
                          <Check
                            size={19}
                            className={styles.readCheck}
                            aria-label="Guide read"
                          />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    ))}
                    {!filteredTopics.length && (
                      <div className={styles.noResults}>
                        Try “car”, “worker” or “bill”.
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => setQuery("")}
                        >
                          Show all guides
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              </>
            )}
            {view === "lesson" && (
              <>
                <div className={styles.stepLabel}>
                  <span>{topic.title}</span>
                  <span>
                    {stepIndex + 1} of {topic.steps.length}
                  </span>
                </div>
                <div
                  className={styles.progress}
                  role="progressbar"
                  aria-label="Tour progress"
                  aria-valuenow={stepIndex + 1}
                  aria-valuemin={0}
                  aria-valuemax={topic.steps.length}
                >
                  {topic.steps.map((item, index) => (
                    <span
                      key={item.id}
                      className={index <= stepIndex ? styles.filled : ""}
                    />
                  ))}
                </div>
                <h2 id="workshop-help-title" ref={heading} tabIndex={-1}>
                  {step.title}
                </h2>
                {locating ? (
                  <p className={styles.locating} role="status">
                    Opening this step…
                  </p>
                ) : (
                  <p className={styles.explanation}>{step.body}</p>
                )}
                {!locating && destination?.note && (
                  <p className={styles.targetNote}>{destination.note}</p>
                )}
                {!locating && targetMissing && !destination?.note && (
                  <p className={styles.targetNote}>
                    This control appears after a record is added or opened. You
                    can continue the tour.
                  </p>
                )}
                {!locating && (step.example || step.tip) && (
                  <details className={styles.moreDetails} key={step.id}>
                    <summary>
                      {step.example ? "A simple example" : "Good to know"}
                    </summary>
                    {step.example && (
                      <div className={styles.example}>
                        <span>{step.example.label}</span>
                        <p>{step.example.text}</p>
                      </div>
                    )}
                    {step.tip && <p className={styles.tip}>{step.tip}</p>}
                  </details>
                )}
                {leaveNotice}
              </>
            )}
            {view === "done" && (
              <div className={styles.done}>
                <span className={styles.doneIcon}>
                  <Check size={28} />
                </span>
                <h2 id="workshop-help-title" ref={heading} tabIndex={-1}>
                  {topic.id === quickTour.id
                    ? "That’s the daily work covered."
                    : "You’ve finished this guide."}
                </h2>
                <p>
                  You don’t need to remember everything. Use ? Help for any
                  task, whenever you need it.
                </p>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={close}
                >
                  Start working <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    setView("menu");
                    setCoachBottom(undefined);
                  }}
                >
                  Choose another guide
                </button>
              </div>
            )}
          </div>
          {view === "lesson" && (
            <footer className={styles.footer}>
              <div className={styles.stepActions}>
                <button
                  type="button"
                  className={styles.back}
                  disabled={stepIndex === 0}
                  onClick={() =>
                    go({ topicId: topic.id, step: stepIndex - 1, completed })
                  }
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={locating || Boolean(pending)}
                  onClick={next}
                >
                  {stepIndex === topic.steps.length - 1 ? "Done" : "Next"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </footer>
          )}
        </div>
      )}
      {!isLesson && (
        <button
          ref={bubble}
          type="button"
          className={styles.bubble}
          aria-expanded={open}
          aria-controls="workshop-help"
          aria-label={open ? "Close help" : "Open help and tutorials"}
          onClick={() => {
            if (open) close();
            else {
              setView("menu");
              setOpen(true);
            }
          }}
        >
          {open ? (
            <X size={23} />
          ) : (
            <>
              <span aria-hidden="true">?</span> Help
            </>
          )}
        </button>
      )}
    </>
  );
}

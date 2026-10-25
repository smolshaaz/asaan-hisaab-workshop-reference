import Link from "next/link";
import { ArrowRight, Check } from "@/lib/icons";
import {
  todayAccountActions,
  type AccountSource,
  type TodayAction,
} from "@/lib/account-summary";
import { money } from "@/lib/format";
import styles from "./today-actions.module.css";

function ActionRow({ action }: { action: TodayAction }) {
  return (
    <li className={styles.action} data-tone={action.tone}>
      <div className={styles.words}>
        <h3>{action.title}</h3>
        <p>{action.reason}</p>
      </div>
      <div className={styles.next}>
        {action.amount !== undefined && <strong>{money(action.amount)}</strong>}
        <Link href={action.href}>
          {action.button}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

export function TodayActions({
  data,
  today,
}: {
  data: AccountSource;
  today: string;
}) {
  const actions = todayAccountActions(data, today);
  return (
    <section
      className={styles.section}
      data-help="today-next"
      aria-labelledby="today-next-title"
    >
      <div className={styles.heading}>
        <div>
          <h2 id="today-next-title">What to do next</h2>
          <p>Follow up money due and check what needs attention.</p>
        </div>
        {actions.length > 0 && (
          <span>
            {actions.length} follow-up{actions.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {actions.length ? (
        <>
          <ol className={styles.list}>
            {actions.slice(0, 3).map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </ol>
          {actions.length > 3 && (
            <details className={styles.more}>
              <summary>
                Show {actions.length - 3} more follow-up
                {actions.length - 3 === 1 ? "" : "s"}
              </summary>
              <ol className={styles.list}>
                {actions.slice(3).map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </ol>
            </details>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <Check size={22} aria-hidden="true" />
          <p>
            No due follow-ups in the saved records. Keep adding bills, payments
            and their dates as they happen.
          </p>
        </div>
      )}
      <p className={styles.scope}>
        Based on recorded balances and dates. These are follow-ups, not a
        forecast of cash available.
      </p>
    </section>
  );
}

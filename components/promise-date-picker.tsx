"use client";

import { addCalendarDays, riyadhDate } from "@/lib/business-date";

export function PromiseDatePicker({
  value,
  onChange,
  label = "Promised to pay by",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const today = riyadhDate();
  const choices = [
    ["Tomorrow", addCalendarDays(today, 1)],
    ["3 days", addCalendarDays(today, 3)],
    ["1 week", addCalendarDays(today, 7)],
  ] as const;
  return (
    <fieldset className="promise-date-picker">
      <legend>{label}</legend>
      <div className="promise-quick-dates">
        {choices.map(([text, date]) => (
          <button
            key={text}
            type="button"
            className={value === date ? "selected" : undefined}
            onClick={() => onChange(date)}
          >
            {text}
          </button>
        ))}
        <label>
          <span>Custom date</span>
          <input
            type="date"
            min={today}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  );
}

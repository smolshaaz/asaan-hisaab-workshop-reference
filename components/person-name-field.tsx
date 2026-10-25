"use client";

import { useId, useState } from "react";
import { Check, Search } from "@/lib/icons";
import styles from "./person-name-field.module.css";

export type PersonChoice = { id?: string; name: string };
type Option = { id: string; name: string; detail?: string };

/** A name is enough. Existing identities are selected explicitly, never merged by spelling. */
export function PersonNameField({
  label,
  value,
  onChange,
  people,
  placeholder = "Type a name",
  disabled = false,
  onSelect,
  hint,
}: {
  label: string;
  value: PersonChoice;
  onChange: (value: PersonChoice) => void;
  people: Option[];
  placeholder?: string;
  disabled?: boolean;
  onSelect?: () => void;
  hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = value.name.trim().toLocaleLowerCase();
  const options = people
    .filter(
      (p) =>
        !term ||
        [p.name, p.detail].join(" ").toLocaleLowerCase().includes(term),
    )
    .slice(0, 6);
  function select(option: Option) {
    onChange({ id: option.id, name: option.name });
    setOpen(false);
    setActive(-1);
    onSelect?.();
  }
  return (
    <div
      className={styles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <Search size={20} aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && options.length > 0}
          aria-controls={id + "-names"}
          aria-activedescendant={
            open && active >= 0 ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          value={value.name}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onChange={(event) => {
            onChange({ name: event.target.value });
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" && options.length) {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, options.length - 1));
            }
            if (event.key === "ArrowUp" && options.length) {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (
              event.key === "Enter" &&
              open &&
              active >= 0 &&
              options[active]
            ) {
              event.preventDefault();
              select(options[active]);
            }
          }}
        />
        {value.id && (
          <Check
            size={20}
            className={styles.selected}
            aria-label="Saved person selected"
          />
        )}
      </div>
      {open && options.length > 0 && (
        <div
          id={id + "-names"}
          role="listbox"
          aria-label="Matching names"
          className={styles.options}
        >
          {options.map((person, index) => (
            <button
              key={person.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={value.id === person.id}
              type="button"
              className={active === index ? styles.active : undefined}
              onClick={() => select(person)}
            >
              <span>
                <strong>{person.name}</strong>
                {person.detail && <small>{person.detail}</small>}
              </span>
              {value.id === person.id && <Check size={18} />}
            </button>
          ))}
        </div>
      )}
      <p className={styles.hint}>
        {value.name.trim() && !value.id
          ? `New name: “${value.name.trim()}”. It will be added when you save. Choose a match above if they are already here.`
          : hint ||
            "Choose a saved name, or type a new one. No other details needed."}
      </p>
    </div>
  );
}

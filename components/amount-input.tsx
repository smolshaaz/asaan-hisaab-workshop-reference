"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";

/** Currency entry without number spinners, wheel changes or arrow-key stepping. */
export function AmountInput({
  onChange,
  value,
  min,
  max,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const input = useRef<HTMLInputElement>(null);
  function validate(element: HTMLInputElement) {
    const text = element.value.trim();
    let message = "";
    if (text && !/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) {
      message = "Enter an amount like 100 or 100.50, with no commas.";
    } else if (text && min !== undefined && Number(text) < Number(min)) {
      message = `Enter an amount of ${min} or more.`;
    } else if (text && max !== undefined && Number(text) > Number(max)) {
      message = `Enter an amount of ${max} or less.`;
    }
    element.setCustomValidity(message);
  }
  useEffect(() => {
    if (input.current) validate(input.current);
  }, [value, min, max]);

  return (
    <input
      {...props}
      ref={input}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        validate(event.currentTarget);
        onChange?.(event);
      }}
    />
  );
}

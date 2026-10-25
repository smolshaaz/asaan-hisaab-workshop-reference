"use client";

import { useRef, useState } from "react";
import { ChevronDown, Copy, Mail, Printer, Send } from "@/lib/icons";

interface DocumentActionsProps {
  kind: "Quotation" | "Invoice";
  number: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  total: number;
  onBeforePrint?: () => void;
}

const amount = new Intl.NumberFormat("en-SA", {
  style: "currency",
  currency: "SAR",
});

const safeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9\u0600-\u06ff_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "Customer";

const whatsappNumber = (value?: string) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
  return digits;
};

export function DocumentActions({
  kind,
  number,
  customerName,
  customerPhone,
  customerEmail,
  total,
  onBeforePrint,
}: DocumentActionsProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [copied, setCopied] = useState(false);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  const shareText = () =>
    `${kind} ${number} for ${customerName}\nTotal: ${amount.format(total)}\n${window.location.href}`;

  const printDocument = () => {
    onBeforePrint?.();
    window.setTimeout(() => {
      const previousTitle = document.title;
      const filename = `${kind}-${safeFilenamePart(customerName)}-${safeFilenamePart(number)}`;
      const restoreTitle = () => {
        document.title = previousTitle;
        window.removeEventListener("afterprint", restoreTitle);
      };

      document.title = filename;
      window.addEventListener("afterprint", restoreTitle, { once: true });
      window.print();
      window.setTimeout(restoreTitle, 30_000);
    }, 50);
  };

  const sendWhatsApp = () => {
    const phone = whatsappNumber(customerPhone);
    const target = `https://wa.me/${phone}?text=${encodeURIComponent(shareText())}`;
    window.open(target, "_blank", "noopener,noreferrer");
    closeMenu();
  };

  const sendEmail = () => {
    const subject = `${kind} ${number} — ${customerName}`;
    const target = `mailto:${customerEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText())}`;
    window.location.href = target;
    closeMenu();
  };

  const shareOrCopy = async () => {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${kind} ${number}`,
          text,
          url: window.location.href,
        });
        closeMenu();
        return;
      }

      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      closeMenu();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      window.prompt("Copy this message", text);
    }
  };

  return (
    <>
      <button
        type="button"
        className="button secondary document-print-action"
        onClick={printDocument}
      >
        <Printer size={16} />
        Print / Save PDF
      </button>
      <details
        ref={menuRef}
        className="document-share-menu"
        aria-label={`Send ${kind.toLowerCase()} ${number}`}
      >
        <summary className="button secondary">
          <Send size={16} />
          Send
          <ChevronDown size={14} />
        </summary>
        <div className="document-share-menu-content">
          <button type="button" onClick={sendWhatsApp}>
            <Send size={16} />
            <span>
              <strong>WhatsApp</strong>
              <small>{customerPhone || "Choose a contact in WhatsApp"}</small>
            </span>
          </button>
          <button type="button" onClick={sendEmail}>
            <Mail size={16} />
            <span>
              <strong>Email</strong>
              <small>{customerEmail || "Choose a recipient"}</small>
            </span>
          </button>
          <button type="button" onClick={() => void shareOrCopy()}>
            <Copy size={16} />
            <span>
              <strong>{copied ? "Copied" : "More sharing"}</strong>
              <small>Phone share sheet or copy the link</small>
            </span>
          </button>
        </div>
      </details>
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { FilePlus, Trash2 } from "@/lib/icons";
import {
  prepareAttachment,
  uploadAttachment,
  type AttachmentLinkType,
} from "@/lib/attachment-client";

type SelectedAttachment = {
  id: string;
  file: File;
  originalName: string;
  preparing: boolean;
  compressed?: boolean;
  error?: string;
};

export function useAttachmentQueue() {
  const [files, setFiles] = useState<SelectedAttachment[]>([]);
  const current = useRef<SelectedAttachment[]>([]);
  function update(
    change: (items: SelectedAttachment[]) => SelectedAttachment[],
  ) {
    current.current = change(current.current);
    setFiles(current.current);
  }
  async function add(selected: File[]) {
    const additions = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalName: file.name,
      preparing: true,
    }));
    update((items) => [...items, ...additions]);
    // Prepare one image at a time to keep phone memory use bounded.
    for (const item of additions) {
      try {
        const prepared = await prepareAttachment(item.file);
        update((items) =>
          items.map((existing) =>
            existing.id === item.id
              ? {
                  ...existing,
                  file: prepared,
                  preparing: false,
                  compressed: prepared !== item.file,
                }
              : existing,
          ),
        );
      } catch (reason) {
        update((items) =>
          items.map((existing) =>
            existing.id === item.id
              ? {
                  ...existing,
                  preparing: false,
                  error:
                    reason instanceof Error
                      ? reason.message
                      : "Could not read this file. Choose another file.",
                }
              : existing,
          ),
        );
      }
    }
  }
  function remove(id: string) {
    update((items) => items.filter((item) => item.id !== id));
  }
  async function upload(linkType: AttachmentLinkType, linkId: string) {
    for (const item of [...current.current]) {
      if (item.preparing || item.error)
        throw new Error(
          `Remove or replace ${item.originalName} before saving its photo.`,
        );
      try {
        await uploadAttachment(linkType, linkId, item.file);
        remove(item.id);
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Try again.";
        throw new Error(`${item.originalName} was not saved. ${message}`);
      }
    }
  }
  return {
    files,
    add,
    remove,
    upload,
    preparing: files.some((file) => file.preparing),
    blocked: files.some((file) => file.preparing || file.error),
  };
}

export function AttachmentPicker({
  queue,
  disabled = false,
}: {
  queue: ReturnType<typeof useAttachmentQueue>;
  disabled?: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const busy = disabled || queue.preparing;
  function select(input: HTMLInputElement) {
    const files = Array.from(input.files || []);
    input.value = "";
    if (files.length) void queue.add(files);
  }
  return (
    <div className="attachment-picker">
      <div className="attachment-actions">
        <input
          ref={camera}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          aria-label="Take a photo"
          onChange={(event) => select(event.target)}
        />
        <input
          ref={picker}
          hidden
          type="file"
          accept="image/*,application/pdf"
          multiple
          disabled={busy}
          aria-label="Choose photos or PDFs"
          onChange={(event) => select(event.target)}
        />
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => camera.current?.click()}
        >
          Take photo
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          <FilePlus size={18} aria-hidden="true" /> Choose photo or PDF
        </button>
      </div>
      <p className="attachment-help muted">
        Large photos are made smaller automatically. Each PDF must be up to 2
        MB.
      </p>
      {queue.files.length > 0 && (
        <ul className="attachment-file-list" aria-label="Files to save">
          {queue.files.map((item) => (
            <li className="attachment-file-row" key={item.id}>
              <div className="attachment-file-name">
                <strong>{item.originalName}</strong>
                {item.error ? (
                  <p role="alert" className="form-error">
                    {item.error}
                  </p>
                ) : (
                  <span className="attachment-file-meta">
                    {item.preparing
                      ? "Preparing photo…"
                      : `${item.compressed ? "Made smaller · " : ""}${Math.max(1, Math.round(item.file.size / 1024))} KB · ready to save`}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={disabled || item.preparing}
                aria-label={`Remove ${item.originalName}`}
                onClick={() => queue.remove(item.id)}
              >
                <Trash2 size={17} aria-hidden="true" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {queue.preparing && (
        <p role="status" className="attachment-help">
          Preparing your photos…
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Download, Save } from "@/lib/icons";
import type { AttachmentLinkType } from "@/lib/attachment-client";
import { AttachmentPicker, useAttachmentQueue } from "./attachment-picker";
import { useProduct } from "./product-context";

type RecordAttachmentsProps = {
  linkType: AttachmentLinkType;
  linkId: string;
};

export function RecordAttachments(props: RecordAttachmentsProps) {
  return (
    <RecordAttachmentFields
      key={`${props.linkType}:${props.linkId}`}
      {...props}
    />
  );
}

function RecordAttachmentFields({ linkType, linkId }: RecordAttachmentsProps) {
  const { data, refresh } = useProduct();
  const queue = useAttachmentQueue();
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const referencedIds =
    linkType === "LEDGER_ENTRY"
      ? data?.ledger.entries.find((entry) => entry.id === linkId)
          ?.attachmentIds || []
      : [];
  const files =
    data?.attachments.filter(
      (file) =>
        (file.linkType === linkType && file.linkId === linkId) ||
        referencedIds.includes(file.id),
    ) || [];

  async function upload() {
    if (busy.current || !queue.files.length || queue.blocked) return;
    busy.current = true;
    setError("");
    setSaved(false);
    setUploading(true);
    try {
      await queue.upload(linkType, linkId);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save this receipt. Try again.",
      );
    } finally {
      await refresh();
      busy.current = false;
      setUploading(false);
    }
  }

  return (
    <section className="entry-attachments" aria-label="Receipts and photos">
      {files.length > 0 && (
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <a
                className="text-link"
                href={
                  (file as typeof file & { dataUrl?: string }).dataUrl || "#"
                }
                download={file.originalName}
              >
                <Download size={16} aria-hidden="true" /> {file.originalName}
              </a>
            </li>
          ))}
        </ul>
      )}
      <AttachmentPicker queue={queue} disabled={uploading} />
      {queue.files.length > 0 && (
        <button
          type="button"
          className="button primary"
          disabled={uploading || queue.blocked}
          onClick={() => void upload()}
        >
          <Save size={16} aria-hidden="true" />{" "}
          {uploading
            ? "Saving files…"
            : error
              ? "Retry saving files"
              : "Save files"}
        </button>
      )}
      {saved && queue.files.length === 0 && (
        <p role="status">Files saved with this record.</p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}

export function LedgerAttachments({ entryId }: { entryId: string }) {
  return <RecordAttachments linkType="LEDGER_ENTRY" linkId={entryId} />;
}

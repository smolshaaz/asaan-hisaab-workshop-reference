import type { AttachmentRecord } from "./product-types";
import {
  REFERENCE_STORAGE_KEY,
  type Snapshot,
} from "./reference-data";

export type AttachmentLinkType =
  "BILL" | "INVOICE" | "LEDGER_ENTRY" | "VEHICLE";
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/** Runs only after a browser file selection; no image leaves the device here. */
export async function prepareAttachment(file: File): Promise<File> {
  if (!file.size) throw new Error("This file is empty. Choose another file.");
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const photo =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(file.name);
  if (!pdf && !photo) throw new Error("Choose a photo or PDF.");
  if (file.size <= MAX_ATTACHMENT_BYTES) return file;
  if (pdf)
    throw new Error(
      "This PDF is over 2 MB. Choose a smaller PDF or take photos of its pages.",
    );

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loaded = new Image();
      loaded.onload = () => resolve(loaded);
      loaded.onerror = () =>
        reject(
          new Error(
            "This photo could not be made smaller. Choose a JPEG photo or a file under 2 MB.",
          ),
        );
      loaded.src = url;
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context || !image.naturalWidth || !image.naturalHeight)
      throw new Error("This photo could not be read. Choose another photo.");
    let scale = Math.min(
      1,
      2400 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    for (let attempt = 0; attempt < 4; attempt += 1) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.75, 0.6]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob && blob.size > 0 && blob.size <= MAX_ATTACHMENT_BYTES) {
          const name = file.name.replace(/\.[^.]+$/, "") || "photo";
          return new File([blob], `${name}.jpg`, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
        }
      }
      scale *= 0.75;
    }
    throw new Error(
      "This photo is still too large. Choose a smaller photo or photograph one page at a time.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadAttachment(
  linkType: AttachmentLinkType,
  linkId: string,
  file: File,
): Promise<AttachmentRecord> {
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES)
    throw new Error("Choose a photo or PDF up to 2 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("This file could not be read."));
    reader.onerror = () => reject(new Error("This file could not be read."));
    reader.readAsDataURL(file);
  });
  const raw = window.localStorage.getItem(REFERENCE_STORAGE_KEY);
  if (!raw) throw new Error("The browser-only workspace is not ready yet.");
  const current = JSON.parse(raw) as Snapshot;
  const record = {
    id: `local-attachment-${crypto.randomUUID()}`,
    linkType,
    linkId,
    originalName: file.name,
    storedName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
    dataUrl,
  } as AttachmentRecord & { dataUrl: string };
  const next: Snapshot = {
    ...current,
    attachments: [record, ...current.attachments],
    ledger: {
      ...current.ledger,
      entries: current.ledger.entries.map((entry) =>
        linkType === "LEDGER_ENTRY" && entry.id === linkId
          ? { ...entry, attachmentIds: [...entry.attachmentIds, record.id] }
          : entry,
      ),
    },
  };
  try {
    window.localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Browser storage is full. Remove an older attachment and try again.",
    );
  }
  return record;
}

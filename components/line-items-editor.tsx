"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { GripVertical, Trash2 } from "@/lib/icons";
import { lineTotals, round2 } from "@/lib/calculations";
import { money } from "@/lib/format";
import type { LineItem, VatCategory } from "@/lib/types";

interface LineItemsEditorProps {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  taxEnabled?: boolean;
  helpTarget?: string;
}

interface SortableLineProps {
  line: LineItem;
  index: number;
  canDelete: boolean;
  taxEnabled: boolean;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
}

function EditableNumber({
  ariaLabel,
  value,
  onValueChange,
  placeholder,
  spinner = false,
  integer = false,
  max,
}: {
  ariaLabel: string;
  value: number;
  onValueChange: (value: number) => void;
  placeholder: string;
  spinner?: boolean;
  integer?: boolean;
  max?: number;
}) {
  const focused = useRef(false);
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    if (!focused.current) setDraft(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      aria-label={ariaLabel}
      type={spinner ? "number" : "text"}
      className={spinner ? undefined : "free-number-input"}
      inputMode={integer ? "numeric" : "decimal"}
      min={spinner ? 1 : undefined}
      max={max}
      step={spinner ? 1 : undefined}
      value={draft}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        if (!draft) return;
        const parsed = Number(draft);
        const next = max === undefined ? parsed : Math.min(parsed, max);
        if (Number.isFinite(next)) {
          setDraft(next === 0 ? "" : String(next));
          onValueChange(next);
        } else {
          setDraft("");
          onValueChange(0);
        }
      }}
      onChange={(event) => {
        const next = event.target.value;
        const valid = integer
          ? /^\d*$/.test(next)
          : /^\d*(?:\.\d*)?$/.test(next);
        if (!valid) return;
        setDraft(next);
        const parsed = Number(next);
        onValueChange(next && Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  ariaLabel: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="line-description"
      aria-label={ariaLabel}
      rows={1}
      value={value}
      onChange={onChange}
      placeholder="Item or service"
    />
  );
}

function SortableLine({
  line,
  index,
  canDelete,
  taxEnabled,
  onUpdate,
  onRemove,
}: SortableLineProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const total = lineTotals(line, taxEnabled).total;
  const gross = line.quantity * line.unitPrice;
  const discountMode = line.discountMode ?? "AMOUNT";
  const discountValue =
    discountMode === "PERCENTAGE"
      ? (line.discountValue ??
        (gross > 0 ? round2((line.discount / gross) * 100) : 0))
      : (line.discountValue ?? line.discount);

  return (
    <div
      ref={setNodeRef}
      className={`line-editor line-items-grid${isDragging ? " is-dragging" : ""}`}
      style={style}
    >
      <button
        type="button"
        className="line-drag-handle"
        aria-label={`Reorder line ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} weight="bold" />
      </button>
      <label className="line-description-field">
        <span className="sr-only">Description</span>
        <AutoGrowTextarea
          ariaLabel={`Line ${index + 1} description`}
          value={line.description}
          onChange={(event) =>
            onUpdate(line.id, { description: event.target.value })
          }
        />
      </label>
      <label className="line-quantity-field">
        <span className="sr-only">Quantity</span>
        <EditableNumber
          ariaLabel={`Line ${index + 1} quantity`}
          value={line.quantity}
          placeholder="1"
          spinner
          integer
          onValueChange={(quantity) => onUpdate(line.id, { quantity })}
        />
      </label>
      <label className="line-price-field">
        <span className="sr-only">Unit price</span>
        <EditableNumber
          ariaLabel={`Line ${index + 1} unit price`}
          value={line.unitPrice}
          placeholder="0.00"
          onValueChange={(unitPrice) => onUpdate(line.id, { unitPrice })}
        />
      </label>
      <label className="line-discount-field">
        <span className="sr-only">Discount</span>
        <span className="line-discount-control">
          <EditableNumber
            ariaLabel={`Line ${index + 1} discount`}
            value={discountValue}
            placeholder="0"
            max={discountMode === "PERCENTAGE" ? 100 : undefined}
            onValueChange={(value) => {
              onUpdate(
                line.id,
                discountMode === "PERCENTAGE"
                  ? {
                      discountMode,
                      discountValue: value,
                      discount: round2((gross * value) / 100),
                    }
                  : {
                      discountMode,
                      discountValue: value,
                      discount: value,
                    },
              );
            }}
          />
          <select
            aria-label={`Line ${index + 1} discount type`}
            value={discountMode}
            onChange={(event) => {
              const mode = event.target.value as "AMOUNT" | "PERCENTAGE";
              const value =
                mode === "PERCENTAGE"
                  ? gross > 0
                    ? round2((line.discount / gross) * 100)
                    : 0
                  : line.discount;
              onUpdate(line.id, {
                discountMode: mode,
                discountValue: value,
              });
            }}
          >
            <option value="AMOUNT">SAR</option>
            <option value="PERCENTAGE">%</option>
          </select>
        </span>
      </label>
      <label className="line-tax-field">
        <span className="sr-only">Tax</span>
        {taxEnabled ? (
          <select
            aria-label={`Line ${index + 1} tax`}
            value={line.vatCategory}
            onChange={(event) => {
              const vatCategory = event.target.value as VatCategory;
              onUpdate(line.id, {
                vatCategory,
                vatRate: vatCategory === "S" ? 15 : 0,
                exemptionReasonCode:
                  vatCategory === "S" ? undefined : line.exemptionReasonCode,
                exemptionReason:
                  vatCategory === "S" ? undefined : line.exemptionReason,
              });
            }}
          >
            <option value="S">15% Standard</option>
            <option value="Z">Zero rated</option>
            <option value="E">Exempt</option>
            <option value="O">Outside scope</option>
          </select>
        ) : (
          <span className="line-tax-disabled">Not added</span>
        )}
      </label>
      <strong className="line-total">
        <span className="line-mobile-label">Total</span>
        {money(total)}
      </strong>
      <button
        type="button"
        className="line-delete"
        aria-label={`Remove line ${index + 1}`}
        disabled={!canDelete}
        onClick={() => onRemove(line.id)}
      >
        <Trash2 size={17} />
      </button>
      {taxEnabled && line.vatCategory !== "S" && (
        <div className="exemption-fields">
          <label>
            Reason code
            <input
              value={line.exemptionReasonCode || ""}
              onChange={(event) =>
                onUpdate(line.id, {
                  exemptionReasonCode: event.target.value,
                })
              }
              placeholder="VATEX-SA-XX"
            />
          </label>
          <label>
            Tax treatment reason
            <input
              value={line.exemptionReason || ""}
              onChange={(event) =>
                onUpdate(line.id, { exemptionReason: event.target.value })
              }
              placeholder="Required explanation"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function LineItemsEditor({
  lines,
  onChange,
  taxEnabled = true,
  helpTarget,
}: LineItemsEditorProps) {
  const dragStartOrder = useRef<LineItem[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorder = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    const from = lines.findIndex((line) => line.id === active.id);
    const to = lines.findIndex((line) => line.id === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(lines, from, to));
  };
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        if (
          next.discountMode === "PERCENTAGE" &&
          ("quantity" in patch || "unitPrice" in patch)
        ) {
          next.discount = round2(
            (next.quantity * next.unitPrice * (next.discountValue ?? 0)) / 100,
          );
        }
        return next;
      }),
    );

  return (
    <div
      className="line-items"
      aria-label="Document items"
      data-help={helpTarget}
    >
      <div className="line-editor-head line-items-grid" aria-hidden="true">
        <span />
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span>Discount</span>
        <span>Tax</span>
        <span>Total</span>
        <span />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          dragStartOrder.current = lines;
        }}
        onDragOver={reorder}
        onDragEnd={() => {
          dragStartOrder.current = null;
        }}
        onDragCancel={() => {
          if (dragStartOrder.current) onChange(dragStartOrder.current);
          dragStartOrder.current = null;
        }}
      >
        <SortableContext
          items={lines.map((line) => line.id)}
          strategy={verticalListSortingStrategy}
        >
          {lines.map((line, index) => (
            <SortableLine
              key={line.id}
              line={line}
              index={index}
              canDelete
              taxEnabled={taxEnabled}
              onUpdate={update}
              onRemove={(id) =>
                onChange(lines.filter((item) => item.id !== id))
              }
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

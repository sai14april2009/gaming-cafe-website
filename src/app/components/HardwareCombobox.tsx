import { useState, useRef, useEffect, useMemo, useId } from "react";
import { Check, X } from "lucide-react";
import type { HardwareGroup } from "../data/hardwareOptions";

interface HardwareComboboxProps {
  value: string;
  onChange: (v: string) => void;
  groups: HardwareGroup[];
  placeholder?: string;
  className?: string;
}

// Emil-strong ease-out — punchier than the built-in cubic-bezier
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Hardware autocomplete input.
 *
 * Features:
 *  - Grouped suggestions (NVIDIA / AMD / Intel, PlayStation / Xbox / Nintendo, …)
 *  - Case-insensitive substring match; matched span is bolded
 *  - Full keyboard nav: ↑/↓ move highlight, Enter picks, Esc closes, Tab commits
 *  - Checkmark on the exact current value
 *  - Clear button (✕)
 *  - Empty-state hint that freeform input is still allowed
 *  - ARIA-1.2 combobox pattern
 *  - Respects prefers-reduced-motion
 *  - Dropdown scales from the input origin (top), not from center
 */
export function HardwareCombobox({ value, onChange, groups, placeholder, className }: HardwareComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // Filter groups against the query; drop empty groups.
  const q = value.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({ label: g.label, items: g.items.filter((it) => it.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [q, groups]);

  // Flat list of items in visual order — the highlight index refers to this.
  const flatItems = useMemo(() => filteredGroups.flatMap((g) => g.items), [filteredGroups]);

  // Reset highlight when the filtered list changes.
  useEffect(() => { setHighlight(0); }, [q, open]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep the highlighted item in view during keyboard nav.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => Math.min(h + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && flatItems[highlight]) {
        e.preventDefault();
        commit(flatItems[highlight]);
      }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); }
    } else if (e.key === "Tab") {
      // Tab commits the current highlight if the dropdown is open, then continues focus flow.
      if (open && flatItems[highlight] && flatItems[highlight].toLowerCase() !== q) {
        onChange(flatItems[highlight]);
      }
      setOpen(false);
    }
  };

  // Bold the matching substring — helps visual scanning
  const renderMatch = (item: string) => {
    if (!q) return item;
    const idx = item.toLowerCase().indexOf(q);
    if (idx === -1) return item;
    return (
      <>
        {item.slice(0, idx)}
        <span className="font-semibold text-blue-600">{item.slice(idx, idx + q.length)}</span>
        {item.slice(idx + q.length)}
      </>
    );
  };

  // Walk filtered groups to assign a stable flat index (matches `flatItems`).
  let runningIdx = -1;
  const totalMatches = flatItems.length;
  const currentIsListed = flatItems.some((it) => it.toLowerCase() === q);

  return (
    <div className="relative" ref={rootRef}>
      {/* Input + clear button */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && flatItems[highlight] ? `${id}-opt-${highlight}` : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(""); inputRef.current?.focus(); setOpen(true); }}
            aria-label="Clear"
            className="hw-clear absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            style={{ transitionDuration: "160ms", transitionTimingFunction: EASE_OUT }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="hw-panel absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-72 py-1"
          style={{
            transformOrigin: "top",
            animation: "hwPanelIn 180ms both",
            animationTimingFunction: EASE_OUT,
          }}
        >
          {totalMatches === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">
              No preset match.{" "}
              <span className="text-gray-400">
                “{value}” will still be saved as-is.
              </span>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.label} className="pb-1 last:pb-0">
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 select-none">
                  {g.label}
                </div>
                {g.items.map((item) => {
                  runningIdx += 1;
                  const idx = runningIdx;
                  const isHighlighted = idx === highlight;
                  const isSelected = item.toLowerCase() === q;
                  return (
                    <button
                      key={item}
                      id={`${id}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-idx={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(e) => { e.preventDefault(); commit(item); }}
                      className={`hw-item w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        isHighlighted ? "bg-blue-50 text-blue-900" : "text-gray-700"
                      }`}
                    >
                      <span className="truncate">{renderMatch(item)}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}

          {/* Footer hint when value is freeform (not matching a preset) */}
          {value && !currentIsListed && totalMatches > 0 && (
            <div className="border-t border-gray-100 mt-1 px-3 py-1.5 text-[10px] text-gray-400">
              ↑↓ navigate · Enter select · custom values allowed
            </div>
          )}
        </div>
      )}

      {/* Scoped styles: entrance keyframe + reduced-motion fallback */}
      <style>{`
        @keyframes hwPanelIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hw-panel { animation: none !important; }
          .hw-clear { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

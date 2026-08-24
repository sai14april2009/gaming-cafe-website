import { useState, useRef, useEffect } from "react";

interface HardwareComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

/**
 * Text input with autocomplete dropdown for hardware fields (GPU/CPU/RAM/Console).
 * Suggestions come from a curated list; owners can still type anything not listed.
 * Matching is case-insensitive substring.
 */
export function HardwareCombobox({ value, onChange, options, placeholder, className }: HardwareComboboxProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = q
    ? options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8)
    : options.slice(0, 8);
  // Hide dropdown when the value exactly matches the only suggestion (owner picked it)
  const showDropdown = open && focused && suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0].toLowerCase() === q);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-56">
          {suggestions.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

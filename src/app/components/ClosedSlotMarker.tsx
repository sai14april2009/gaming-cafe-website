import { Lock } from "lucide-react";

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
};

interface ClosedSlotMarkerProps {
  from: number;
  to: number;
  size: "sm" | "lg";
}

export function ClosedSlotMarker({ from, to, size }: ClosedSlotMarkerProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-gray-400 cursor-default select-none ${
        size === "sm"
          ? "px-2.5 py-1.5 text-xs"
          : "px-4 py-3 text-sm"
      }`}
    >
      <Lock className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      <span className="font-medium">Closed {formatHour(from)} – {formatHour(to)}</span>
    </div>
  );
}

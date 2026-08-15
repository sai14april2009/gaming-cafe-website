import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Wrench, Trash2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { toLocalDateString } from "../utils/date";
import { findSlotConflicts } from "../utils/slotConflicts";

interface RepairSlotsManagerProps {
  cafeId: string;
}

interface GamingSystem {
  id: string;
  name: string;
}

interface RepairSlot {
  id: string;
  system_id: string;
  repair_date: string;
  start_hour: number;
  end_hour: number;
  reason: string | null;
  gaming_systems: { name: string };
}

export function RepairSlotsManager({ cafeId }: RepairSlotsManagerProps) {
  const [systems, setSystems] = useState<GamingSystem[]>([]);
  const [repairSlots, setRepairSlots] = useState<RepairSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(11);
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchData();
  }, [cafeId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: systemsData } = await supabase
      .from("gaming_systems")
      .select("id, name")
      .eq("cafe_id", cafeId);

    const { data: repairData } = await supabase
      .from("repair_slots")
      .select("*, gaming_systems(name)")
      .eq("cafe_id", cafeId)
      .gte("repair_date", toLocalDateString(new Date()))
      .order("repair_date", { ascending: true });

    setSystems(systemsData || []);
    setRepairSlots(repairData || []);
    setLoading(false);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const handleAddRepair = async () => {
    if (!selectedSystem || !selectedDate) {
      setErrorMsg("Please select a system and date.");
      return;
    }
    if (startHour >= endHour) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // Same three-source pre-insert re-check the Gaming Systems grid uses (shared
    // helper): you can't block a slot already held by a walk-in, a confirmed
    // booking, or another repair. repair_slots has no DB overlap constraint, so
    // this check is the only guard for the form.
    const slots: number[] = [];
    for (let h = startHour; h < endHour; h++) slots.push(h);
    const conflicts = await findSlotConflicts(selectedSystem, selectedDate, slots);
    if (conflicts.length > 0) {
      const label: Record<string, string> = {
        "walk-in": "a walk-in",
        booking: "a confirmed booking",
        repair: "another repair",
      };
      const byType: Record<string, number[]> = {};
      conflicts.forEach((c) => {
        if (!byType[c.source]) byType[c.source] = [];
        byType[c.source].push(c.hour);
      });
      const parts = Object.entries(byType).map(
        ([src, hrs]) => `${hrs.map(formatHour).join(", ")} (${label[src]})`
      );
      setErrorMsg(`Can't block for repair — these hours are already taken: ${parts.join("; ")}. Pick another time.`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("repair_slots").insert({
      cafe_id: cafeId,
      system_id: selectedSystem,
      repair_date: selectedDate,
      start_hour: startHour,
      end_hour: endHour,
      reason: reason || null,
    });

    if (error) {
      // 23P01 = an exclusion-constraint violation caught as a concurrency backstop,
      // mirroring the grid. (repair_slots has no such constraint today, so this
      // path won't fire on a repair insert — the pre-check above is the real guard —
      // but the pattern matches and future-proofs it.)
      setErrorMsg(
        (error as any).code === "23P01"
          ? "That time was just taken by another action. Pick another time."
          : "Failed to save repair slot. Try again."
      );
      console.error(error);
      setSaving(false);
      return;
    }

    setSuccessMsg("✅ Repair slot added successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
    setShowForm(false);
    setReason("");
    fetchData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("repair_slots")
      .delete()
      .eq("id", id);

    if (!error) {
      setSuccessMsg("✅ Repair slot removed.");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    }
  };

  // Generate hours for dropdowns
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get today's date string for min date (local day, not UTC — see utils/date.ts)
  const today = toLocalDateString(new Date());

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading repair slots...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">Repair Slots</h2>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Mark as Repair
        </Button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border-2 border-green-400 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-red-50 border-2 border-red-400 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Add Repair Form */}
      {showForm && (
        <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <h3 className="font-semibold text-gray-800 mb-4">Add Repair Slot</h3>
          <div className="grid md:grid-cols-2 gap-4">

            {/* System selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gaming System</label>
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
              >
                <option value="">Select system...</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                min={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
              />
            </div>

            {/* Start hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </div>

            {/* End hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. GPU replacement, monitor repair..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowForm(false); setErrorMsg(null); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-400"
              onClick={handleAddRepair}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Repair Slot"}
            </Button>
          </div>
        </div>
      )}

      {/* Existing repair slots */}
      {repairSlots.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No upcoming repair slots. Click "Mark as Repair" to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-3">Upcoming repair slots (visible to customers as unavailable):</p>
          {repairSlots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div>
                <div className="font-semibold text-gray-800">
                  🖥️ {slot.gaming_systems?.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📅 {new Date(slot.repair_date).toDateString()} &nbsp;|&nbsp;
                  🕐 {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
                </div>
                {slot.reason && (
                  <div className="text-sm text-blue-700 mt-1">🔧 {slot.reason}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(slot.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove repair slot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
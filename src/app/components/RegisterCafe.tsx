import { useState, Fragment } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabase";
import { crossesMidnight } from "../utils/cafeHours";
import { geocodeAddress } from "../utils/geocode";
import { LocationPicker } from "./LocationPicker";
import {
  Store, MapPin, Clock, IndianRupee, Monitor, Gamepad2,
  ArrowRight, ArrowLeft, Plus, Trash2, Check, Sparkles,
  Phone, Mail, Building2, Image as ImageIcon, Zap,
  ChevronRight,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────
const fmtTime = (t: string) => {
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (h === 0) return `12:${m} AM`;
  if (h < 12) return `${h}:${m} AM`;
  if (h === 12) return `12:${m} PM`;
  return `${h - 12}:${m} PM`;
};

// ── types ─────────────────────────────────────────────────────────────────
interface Sys {
  id: string;
  name: string;
  type: "PC" | "Console";
  gpu: string;
  cpu: string;
  ram: string;
  console_name: string;
  price: string; // optional per-system price; blank = cafe default
}

interface FormState {
  name: string; description: string; image_url: string;
  city: string; address: string; phone: string; email: string;
  price_per_hour: string; open_time: string; close_time: string;
}

// ── step definitions ───────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: "Cafe Profile", icon: Store },
  { num: 2, label: "Location",     icon: MapPin },
  { num: 3, label: "Schedule",     icon: Clock },
  { num: 4, label: "Systems",      icon: Gamepad2 },
];

// ── sub-components ─────────────────────────────────────────────────────────

function FloatInput({
  icon: Icon, field, label, type = "text", value, onChange, required, autoComplete,
  stagger = 0,
}: {
  icon: any; field: string; label: string; type?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
  autoComplete?: string; stagger?: number;
}) {
  return (
    <div
      className="auth-field auth-input-wrap group"
      style={{ "--field-i": stagger } as React.CSSProperties}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10 pointer-events-none">
        <Icon className="w-4 h-4" />
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="auth-input pl-11"
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
      />
      <label className="auth-label left-11">{label}{required ? " *" : ""}</label>
    </div>
  );
}

function StepProfile({ form, set }: { form: FormState; set: (f: string, v: string) => void }) {
  return (
    <div className="space-y-5">
      <p className="auth-field text-sm text-gray-500" style={{ "--field-i": 0 } as React.CSSProperties}>
        What should gamers call your place?
      </p>

      <FloatInput icon={Store} field="name" label="Cafe name" value={form.name} onChange={(v) => set("name", v)} required stagger={1} />

      <div className="auth-field" style={{ "--field-i": 2 } as React.CSSProperties}>
        <label className="text-sm font-medium text-gray-600 mb-2 block">About your cafe</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Tell gamers what makes your cafe unique — hardware quality, vibe, tournaments..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
          style={{ boxShadow: "none" }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <FloatInput icon={ImageIcon} field="image_url" label="Cover image URL" value={form.image_url} onChange={(v) => set("image_url", v)} stagger={3} />

      {form.image_url && (
        <div
          className="auth-field overflow-hidden rounded-xl border-2 border-gray-100 aspect-[16/7] bg-gray-100"
          style={{ "--field-i": 4 } as React.CSSProperties}
        >
          <img
            src={form.image_url}
            alt="Cover preview"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.parentElement!.style.display = "none"; }}
          />
        </div>
      )}
    </div>
  );
}

function StepLocation({
  form, set, coords, onPickLocation,
}: {
  form: FormState;
  set: (f: string, v: string) => void;
  coords: { lat: number | null; lng: number | null };
  onPickLocation: (lat: number, lng: number) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="auth-field text-sm text-gray-500" style={{ "--field-i": 0 } as React.CSSProperties}>
        Where can gamers find you?
      </p>

      <FloatInput icon={Building2} field="city" label="City" value={form.city} onChange={(v) => set("city", v)} required stagger={1} />
      <FloatInput icon={MapPin} field="address" label="Street address" value={form.address} onChange={(v) => set("address", v)} required stagger={2} />

      {/* Map pin — the exact location gamers navigate to. Type the address above, then
          "Find my address" to drop the pin, or "Use my current location" if you're at the cafe. */}
      <div className="auth-field" style={{ "--field-i": 3 } as React.CSSProperties}>
        <label className="text-sm font-medium text-gray-600 mb-2 block">Pin your exact location</label>
        <LocationPicker
          lat={coords.lat}
          lng={coords.lng}
          address={form.address}
          city={form.city}
          onChange={onPickLocation}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FloatInput icon={Phone} field="phone" label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} stagger={4} />
        <FloatInput icon={Mail} field="email" label="Contact email" type="email" value={form.email} onChange={(v) => set("email", v)} stagger={5} autoComplete="email" />
      </div>
    </div>
  );
}

function StepSchedule({ form, set }: { form: FormState; set: (f: string, v: string) => void }) {
  const crossesMid = form.open_time && form.close_time && crossesMidnight(form.open_time, form.close_time);

  return (
    <div className="space-y-5">
      <p className="auth-field text-sm text-gray-500" style={{ "--field-i": 0 } as React.CSSProperties}>
        Set your pricing and hours. Gamers book by the slot.
      </p>

      {/* Price */}
      <div className="auth-field" style={{ "--field-i": 1 } as React.CSSProperties}>
        <label className="text-sm font-medium text-gray-600 mb-2 block">Price per hour *</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IndianRupee className="w-4 h-4" />
          </div>
          <input
            type="number" step="1" min="1"
            value={form.price_per_hour}
            onChange={(e) => set("price_per_hour", e.target.value)}
            placeholder="60"
            className="w-full pl-11 pr-14 py-3.5 border-2 border-gray-200 rounded-xl text-xl font-bold bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            style={{ boxShadow: "none" }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">/hr</span>
        </div>
        {form.price_per_hour && parseFloat(form.price_per_hour) > 0 && (
          <div className="auth-field flex items-center gap-4 mt-2 text-xs text-gray-500" style={{ "--field-i": 0 } as React.CSSProperties}>
            <span className="text-blue-600 font-semibold">₹{form.price_per_hour}/hour</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span>₹{(parseFloat(form.price_per_hour) * 4).toFixed(0)} for 4 hrs</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span>₹{(parseFloat(form.price_per_hour) * 8).toFixed(0)} for 8 hrs</span>
          </div>
        )}
      </div>

      {/* Hours */}
      <div className="auth-field" style={{ "--field-i": 2 } as React.CSSProperties}>
        <label className="text-sm font-medium text-gray-600 mb-2 block">Operating hours</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-medium uppercase tracking-wide">Opens at</label>
            <input
              type="time" value={form.open_time}
              onChange={(e) => set("open_time", e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-medium uppercase tracking-wide">Closes at</label>
            <input
              type="time" value={form.close_time}
              onChange={(e) => set("close_time", e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
        </div>

        {crossesMid && (
          <div className="auth-field mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-100" style={{ "--field-i": 0 } as React.CSSProperties}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            Closes at {fmtTime(form.close_time)} the next day — midnight-crossing schedule detected
          </div>
        )}
      </div>

      {/* Visual hours bar */}
      {form.open_time && form.close_time && (
        <div className="auth-field bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl px-5 py-4 border border-blue-100" style={{ "--field-i": 3 } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-blue-700 w-20 text-right">{fmtTime(form.open_time)}</span>
            <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                style={{ width: crossesMid ? "100%" : "65%", transition: "width 600ms cubic-bezier(0.23,1,0.32,1)" }}
              />
            </div>
            <span className="text-sm font-bold text-blue-700 w-20">{fmtTime(form.close_time)}{crossesMid ? " +1" : ""}</span>
          </div>
          <p className="text-xs text-blue-400 mt-1.5 text-center">Your daily booking window</p>
        </div>
      )}
    </div>
  );
}

function StepSystems({
  systems, setSystems, newSys, setNewSys, addSys, setAddSys, addSystem,
}: {
  systems: Sys[];
  setSystems: (fn: (p: Sys[]) => Sys[]) => void;
  newSys: Omit<Sys, "id">;
  setNewSys: (fn: (p: Omit<Sys, "id">) => Omit<Sys, "id">) => void;
  addSys: boolean;
  setAddSys: (v: boolean) => void;
  addSystem: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="auth-field" style={{ "--field-i": 0 } as React.CSSProperties}>
        <p className="text-sm text-gray-600 font-medium mb-0.5">Add your gaming rigs</p>
        <p className="text-xs text-gray-400">
          Gamers pick the exact machine they want — detailed specs drive more bookings.
          You can also add systems later from your dashboard.
        </p>
      </div>

      {/* Existing system cards */}
      {systems.map((s, i) => (
        <div
          key={s.id}
          className="reg-sys-card auth-field flex items-center gap-3 p-3.5 bg-white rounded-xl border-2 border-gray-100"
          style={{ "--field-i": i } as React.CSSProperties}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            s.type === "PC" ? "bg-blue-50" : "bg-purple-50"
          }`}>
            {s.type === "PC"
              ? <Monitor className="w-5 h-5 text-blue-600" />
              : <Gamepad2 className="w-5 h-5 text-purple-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 truncate">{s.name}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                s.type === "PC" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
              }`}>{s.type}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.type === "PC" ? (
                <>
                  {s.gpu && <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-600"><span className="font-medium text-gray-400">GPU </span>{s.gpu}</span>}
                  {s.cpu && <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-600"><span className="font-medium text-gray-400">CPU </span>{s.cpu}</span>}
                  {s.ram && <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-600"><span className="font-medium text-gray-400">RAM </span>{s.ram}</span>}
                </>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                  <span className="font-medium text-gray-400">Console </span>{s.console_name}
                </span>
              )}
              {s.price.trim() !== "" && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-blue-600 font-medium">
                  ₹{s.price}/hr
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSystems((p) => p.filter((x) => x.id !== s.id))}
            className="text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add system inline form */}
      {addSys ? (
        <div
          className="auth-field border-2 border-blue-100 rounded-xl p-5 bg-blue-50/40 space-y-4"
          style={{ "--field-i": 0 } as React.CSSProperties}
        >
          {/* Header + type toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">New System</span>
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              {(["PC", "Console"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setNewSys((p) => ({ ...p, type: t }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    newSys.type === t
                      ? t === "PC"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-purple-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "PC" ? <Monitor className="w-3 h-3" /> : <Gamepad2 className="w-3 h-3" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* System name */}
          <input
            type="text"
            value={newSys.name}
            onChange={(e) => setNewSys((p) => ({ ...p, name: e.target.value }))}
            placeholder="System name (e.g. Station 1, PC-Alpha)"
            className="reg-input"
          />

          {/* Spec fields */}
          {newSys.type === "PC" ? (
            <div className="grid grid-cols-3 gap-3">
              {([
                ["GPU", "gpu", "RTX 4070 Ti"],
                ["CPU", "cpu", "i7-13700K"],
                ["RAM", "ram", "32GB DDR5"],
              ] as const).map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <input
                    type="text"
                    value={(newSys as any)[key]}
                    onChange={(e) => setNewSys((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph}
                    className="reg-input !text-xs !py-2.5"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Console Model</label>
              <input
                type="text"
                value={newSys.console_name}
                onChange={(e) => setNewSys((p) => ({ ...p, console_name: e.target.value }))}
                placeholder="PS5, Xbox Series X, Nintendo Switch..."
                className="reg-input"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Price / hour (₹) — optional
            </label>
            <input
              type="number" min="0" step="1"
              value={newSys.price}
              onChange={(e) => setNewSys((p) => ({ ...p, price: e.target.value }))}
              placeholder="Leave blank to use the cafe default"
              className="reg-input"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAddSys(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-500 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addSystem}
              disabled={!newSys.name.trim()}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Add System
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddSys(true)}
          className="auth-field w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/40 transition-all group"
          style={{ "--field-i": systems.length } as React.CSSProperties}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-sm font-semibold">Add a Gaming System</span>
          <span className="text-xs opacity-70">PC with specs or a console</span>
        </button>
      )}
    </div>
  );
}

function LivePreview({ form, systems }: { form: FormState; systems: Sys[] }) {
  const { name, city, price_per_hour, image_url, description } = form;
  const hasContent = name || city || price_per_hour;

  return (
    <div className="reg-preview-card bg-white rounded-2xl overflow-hidden border-2 border-gray-100 shadow-xl">
      {/* Cover image */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-slate-200 overflow-hidden">
        {image_url ? (
          <img src={image_url} alt="" className="w-full h-full object-cover transition-all duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">Cover image preview</span>
          </div>
        )}
        {price_per_hour && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-lg font-extrabold text-gray-900">₹{price_per_hour}</span>
            <span className="text-xs text-gray-400 font-medium">/hr</span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      <div className="p-5">
        <h3 className="font-extrabold text-gray-900 text-xl leading-tight transition-all">
          {name || <span className="text-gray-200">Cafe Name</span>}
        </h3>
        {city && (
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {city}
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Systems preview */}
        {systems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {systems.length} Gaming {systems.length === 1 ? "System" : "Systems"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {systems.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                    s.type === "PC"
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : "bg-purple-50 text-purple-600 border border-purple-100"
                  }`}
                >
                  {s.type === "PC" ? <Monitor className="w-3 h-3" /> : <Gamepad2 className="w-3 h-3" />}
                  {s.name}
                </span>
              ))}
              {systems.length > 5 && (
                <span className="text-xs text-gray-400 self-center">+{systems.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-semibold border border-amber-100">
            Pending Review
          </span>
          {!hasContent && (
            <span className="text-xs text-gray-300">Fill the form to preview</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export function RegisterCafe({ onRegistered }: { onRegistered: () => void }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<"fwd" | "bwd">("fwd");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "", description: "", image_url: "",
    city: "", address: "", phone: "", email: profile?.email || "",
    price_per_hour: "", open_time: "", close_time: "",
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [systems, setSystems] = useState<Sys[]>([]);
  const [addSys, setAddSys] = useState(false);
  const [newSys, setNewSys] = useState<Omit<Sys, "id">>({
    name: "", type: "PC", gpu: "", cpu: "", ram: "", console_name: "", price: "",
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const validate = (): string => {
    if (step === 1 && !form.name.trim()) return "Cafe name is required";
    if (step === 2 && !form.city.trim()) return "City is required";
    if (step === 2 && !form.address.trim()) return "Address is required";
    if (step === 3 && !form.price_per_hour) return "Price per hour is required";
    return "";
  };

  const goTo = (n: number) => {
    setDir(n > step ? "fwd" : "bwd");
    setStep(n);
    setError("");
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    goTo(step + 1);
  };

  const addSystem = () => {
    if (!newSys.name.trim()) return;
    setSystems((p) => [...p, { ...newSys, id: crypto.randomUUID() }]);
    setNewSys({ name: "", type: "PC", gpu: "", cpu: "", ram: "", console_name: "", price: "" });
    setAddSys(false);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // The map pin the owner placed is the source of truth. Only if they never touched
    // the map do we fall back to geocoding the typed address (best-effort placement).
    let lat = coords.lat;
    let lng = coords.lng;
    if (lat == null || lng == null) {
      const g = await geocodeAddress(form.address, form.city);
      lat = g.lat;
      lng = g.lng;
    }

    const { data: cafe, error: e1 } = await supabase
      .from("cafes")
      .insert({
        owner_id: user?.id,
        name: form.name, description: form.description,
        city: form.city, address: form.address,
        phone: form.phone, email: form.email,
        price_per_hour: parseFloat(form.price_per_hour),
        image_url: form.image_url,
        latitude: lat, longitude: lng,
        is_approved: false,
      })
      .select("id")
      .single();

    if (e1) { setError(e1.message); setLoading(false); return; }

    // Seed cafe_hours for all 7 days
    if (cafe?.id && form.open_time && form.close_time) {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        cafe_id: cafe.id, day_of_week: i,
        open_time: form.open_time, close_time: form.close_time,
      }));
      const { error: hoursErr } = await supabase.from("cafe_hours").insert(rows);
      if (hoursErr) console.warn("cafe_hours seed failed:", hoursErr.message);
    }

    // Insert gaming systems
    if (cafe?.id && systems.length > 0) {
      const { error: sysErr } = await supabase.from("gaming_systems").insert(
        systems.map((s) => ({
          cafe_id: cafe.id,
          name: s.name,
          type: s.type,
          gpu: s.type === "PC" ? s.gpu || null : null,
          cpu: s.type === "PC" ? s.cpu || null : null,
          ram: s.type === "PC" ? s.ram || null : null,
          console: s.type === "Console" ? s.console_name || null : null,
          // Blank per-system price = inherit the cafe default (stored NULL).
          price_per_hour: s.price.trim() === "" ? null : parseFloat(s.price),
        }))
      );
      if (sysErr) console.warn("gaming_systems seed failed:", sysErr.message);
    }

    setLoading(false);
    setDone(true);
    setTimeout(onRegistered, 2200);
  };

  // ── success screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="success-pop bg-white rounded-2xl shadow-2xl shadow-gray-200/50 p-14 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
            <Check className="w-10 h-10 text-green-600 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're on the list!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your cafe is under review. We'll notify you once it's approved and live on GameOrbit.
          </p>
          <div className="mt-6 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ animation: "loading-bar 2.2s linear forwards" }} />
          </div>
        </div>
        <style>{`@keyframes loading-bar { from { width:0% } to { width:100% } }`}</style>
      </div>
    );
  }

  // ── main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 animate-in" style={{ "--stagger": 0 } as React.CSSProperties}>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-bold px-4 py-2 rounded-full mb-4 border border-blue-100 uppercase tracking-wider">
            <Zap className="w-3 h-3" />
            Join GameOrbit Network
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
            Register Your Cafe
          </h1>
          <p className="text-gray-500">
            Set up your gaming cafe in minutes. Start accepting bookings today.
          </p>
        </div>

        {/* Progress stepper */}
        <div className="animate-in mb-8" style={{ "--stagger": 1 } as React.CSSProperties}>
          <div className="flex items-start justify-center">
            {STEPS.map((s, i) => {
              const isDone = step > s.num;
              const isActive = step === s.num;
              const Icon = s.icon;
              return (
                <Fragment key={s.num}>
                  <div className="flex flex-col items-center">
                    <div className={`reg-step-dot ${isDone ? "reg-step-done" : isActive ? "reg-step-active" : "reg-step-pending"}`}>
                      {isDone
                        ? <Check className="w-5 h-5 stroke-[2.5]" />
                        : <Icon className="w-4 h-4" />
                      }
                    </div>
                    <span className={`text-xs mt-2 font-semibold hidden sm:block whitespace-nowrap transition-colors ${
                      isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-gray-300"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="h-0.5 w-16 sm:w-24 flex-shrink-0 mt-5 mx-1 rounded-full transition-all duration-500"
                      style={{ background: step > s.num ? "#22c55e" : "#e5e7eb" }}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Two-column layout: form + live preview */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* Form card */}
          <div
            className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden animate-in"
            style={{ "--stagger": 2 } as React.CSSProperties}
          >
            {/* Step header bar (gradient) */}
            <div className="auth-gradient px-8 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  {(() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-5 h-5 opacity-80" />; })()}
                  <div>
                    <div className="text-xs text-white/50 font-bold uppercase tracking-widest">
                      Step {step} of {STEPS.length}
                    </div>
                    <div className="font-extrabold text-xl leading-tight">{STEPS[step - 1].label}</div>
                  </div>
                </div>
                {/* Mini progress dots */}
                <div className="flex gap-1.5">
                  {STEPS.map((s) => (
                    <div
                      key={s.num}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: step === s.num ? 20 : 8,
                        height: 8,
                        background: step >= s.num ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Animated step content */}
              <div key={`${step}-${dir}`} className={dir === "fwd" ? "step-fwd" : "step-bwd"}>
                {step === 1 && <StepProfile form={form} set={set} />}
                {step === 2 && (
                  <StepLocation
                    form={form}
                    set={set}
                    coords={coords}
                    onPickLocation={(lat, lng) => setCoords({ lat, lng })}
                  />
                )}
                {step === 3 && <StepSchedule form={form} set={set} />}
                {step === 4 && (
                  <StepSystems
                    systems={systems}
                    setSystems={setSystems}
                    newSys={newSys}
                    setNewSys={setNewSys}
                    addSys={addSys}
                    setAddSys={setAddSys}
                    addSystem={addSystem}
                  />
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
                {step > 1 && (
                  <button type="button" onClick={() => goTo(step - 1)} className="reg-back-btn">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                <div className="flex-1" />
                {step < 4 ? (
                  <button type="button" onClick={next} className="auth-btn !w-auto px-8 flex items-center gap-2">
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="auth-btn !w-auto px-8 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Launch Cafe
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live preview — sticky sidebar */}
          <div
            className="hidden lg:block animate-in"
            style={{ "--stagger": 3 } as React.CSSProperties}
          >
            <div className="sticky top-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Preview</span>
              </div>
              <LivePreview form={form} systems={systems} />
              <p className="text-xs text-gray-400 mt-3 text-center">
                How your cafe appears to gamers
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

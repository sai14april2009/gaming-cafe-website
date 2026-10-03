import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { supabase } from "../../supabase";
import { normalizeCity } from "../utils/city";

interface Stat {
  key: string;
  label: string;
  value: number;
  suffix?: string;
}

// Live network stats, animated with NumberFlow on the auth branding panel.
// Counts come straight from Supabase so the numbers are real, not vanity.
// (systems uses a head:true count so it isn't capped at 1000 rows.)
export function AuthStats() {
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<Stat[]>([
    { key: "cafes", label: "Cafes", value: 0 },
    { key: "systems", label: "Gaming rigs", value: 0 },
    { key: "cities", label: "Cities", value: 0 },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: cafeRows, count: cafeCount }, { count: sysCount }] = await Promise.all([
        supabase.from("cafes").select("city", { count: "exact" }).eq("is_approved", true),
        supabase.from("gaming_systems").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      const cities = new Set((cafeRows ?? []).map((c: { city: string }) => normalizeCity(c.city))).size;
      // Small delay so the mount→value change actually tweens from 0.
      setTimeout(() => {
        if (cancelled) return;
        setStats([
          { key: "cafes", label: "Cafes", value: cafeCount ?? 0 },
          { key: "systems", label: "Gaming rigs", value: sysCount ?? 0 },
          { key: "cities", label: "Cities", value: cities },
        ]);
      }, 150);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mt-10 grid grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.key}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.15 + i * 0.1 }}
          className="auth-stat rounded-2xl px-3 py-4 text-center"
        >
          <div className="text-3xl font-extrabold text-white tabular-nums leading-none">
            <NumberFlow value={s.value} />
            {s.suffix}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-white/60">
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { Gamepad2, User, Mail, Lock, ArrowRight, Zap, Shield, Users, Monitor, Store } from "lucide-react";

export function Signup() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"customer" | "owner">("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      });
      // Refresh profile NOW so the role is available immediately after navigate
      await refreshProfile();
    }
    navigate("/");
    setLoading(false);
  }

  /* 3D tilt — direct DOM, no re-renders (slightly less intense than login) */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform =
      `perspective(800px) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) cardRef.current.style.transform = "";
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* ── Branding panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-[45%] auth-gradient relative overflow-hidden items-center justify-center p-12">
        <div className="auth-float absolute w-64 h-64 rounded-full bg-white/5 -top-20 -left-20" style={{ animationDelay: "0s" }} />
        <div className="auth-float absolute w-48 h-48 rounded-full bg-white/5 top-1/3 right-10" style={{ animationDelay: "2s" }} />
        <div className="auth-float absolute w-32 h-32 rounded-full bg-white/10 bottom-20 left-1/4" style={{ animationDelay: "4s" }} />
        <div className="auth-float absolute w-20 h-20 rounded-full bg-cyan-400/10 top-20 right-1/3" style={{ animationDelay: "1s" }} />

        <div className="relative z-10 text-white max-w-md animate-in" style={{ "--stagger": 0 } as React.CSSProperties}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <span className="text-3xl font-bold tracking-tight">GameSpot</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Your Gaming Hub<br />Awaits
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Join thousands of gamers booking premium setups at top gaming cafes.
          </p>
          <div className="space-y-4">
            {[
              { icon: Zap, text: "Book in seconds" },
              { icon: Shield, text: "Verified cafe network" },
              { icon: Users, text: "Built for gamers, by gamers" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="auth-field flex items-center gap-3 text-white/80" style={{ "--field-i": i } as React.CSSProperties}>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50/80">
        <div
          ref={cardRef}
          className="auth-card-3d w-full max-w-md"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="animate-in bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8" style={{ "--stagger": 0 } as React.CSSProperties}>
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <Gamepad2 className="w-7 h-7 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
                GameSpot
              </span>
            </div>

            <div className="auth-field" style={{ "--field-i": 0 } as React.CSSProperties}>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
              <p className="text-gray-500 mb-6">Start your gaming journey</p>
            </div>

            {error && (
              <div className="auth-field bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100" style={{ "--field-i": 0 } as React.CSSProperties}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="auth-field auth-input-wrap group" style={{ "--field-i": 1 } as React.CSSProperties}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input pl-11"
                  placeholder=" "
                  required
                />
                <label className="auth-label left-11">Full name</label>
              </div>

              <div className="auth-field auth-input-wrap group" style={{ "--field-i": 2 } as React.CSSProperties}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input pl-11"
                  placeholder=" "
                  required
                  autoComplete="email"
                />
                <label className="auth-label left-11">Email address</label>
              </div>

              <div className="auth-field auth-input-wrap group" style={{ "--field-i": 3 } as React.CSSProperties}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input pl-11"
                  placeholder=" "
                  required
                  autoComplete="new-password"
                />
                <label className="auth-label left-11">Password</label>
              </div>

              {/* Role selector — 3D cards with icon, title, description */}
              <div className="auth-field" style={{ "--field-i": 4 } as React.CSSProperties}>
                <p className="text-sm font-medium text-gray-700 mb-3">I want to...</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className="role-card-3d text-left p-4"
                    data-selected={role === "customer"}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      role === "customer" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">Play Games</div>
                    <div className="text-xs text-gray-500 mt-1">Book sessions at cafes</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("owner")}
                    className="role-card-3d text-left p-4"
                    data-selected={role === "owner"}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      role === "owner" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">Run a Cafe</div>
                    <div className="text-xs text-gray-500 mt-1">Manage bookings & systems</div>
                  </button>
                </div>
              </div>

              <div className="auth-field" style={{ "--field-i": 5 } as React.CSSProperties}>
                <button type="submit" disabled={loading} className="auth-btn flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="auth-field mt-6 text-center" style={{ "--field-i": 6 } as React.CSSProperties}>
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

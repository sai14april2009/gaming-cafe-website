import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Gamepad2, User, LogOut, ShieldCheck, Ticket } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ADMIN_EMAILS = [
  "srisaikumar.ojjela@gmail.com",
  "sai14april2009@gmail.com",
  "alekhya.ojjela@gmail.com",
];

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const userEmail = profile?.email || user?.email || "";
  const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase());

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                GameSpot
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{profile?.full_name || user.email}</span>
                  </div>
                  <Link
                    to="/my-bookings"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive("/my-bookings")
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    <span className="hidden lg:inline">My Bookings</span>
                  </Link>
                  {profile?.role === "owner" && (
                    <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors">
                      Dashboard
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
                    Sign in
                  </Link>
                  <Link to="/signup" className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

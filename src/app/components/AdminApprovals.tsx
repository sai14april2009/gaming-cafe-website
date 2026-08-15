import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const ADMIN_EMAILS = [
  "srisaikumar.ojjela@gmail.com",
  "sai14april2009@gmail.com",
  "alekhya.ojjela@gmail.com",
];

interface AdminCafe {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  price_per_hour: number;
  image_url: string | null;
  is_approved: boolean;
  owner_id: string;
  created_at: string;
}

export function AdminApprovals() {
  const { user, profile, loading: authLoading } = useAuth();
  const [cafes, setCafes] = useState<AdminCafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userEmail = profile?.email || user?.email || "";
  const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase());

  useEffect(() => {
    if (!isAdmin) return;

    const fetchCafes = async () => {
      const { data, error } = await supabase
        .from("cafes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCafes(data as AdminCafe[]);
      }
      setLoading(false);
    };

    fetchCafes();
  }, [isAdmin]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setActionError("");

    const { error } = await supabase
      .from("cafes")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      setActionError(error.message);
    } else {
      setCafes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: true } : c))
      );
    }
    setProcessingId(null);
  };

  const handleUnapprove = async (id: string) => {
    setProcessingId(id);
    setActionError("");

    const { error } = await supabase
      .from("cafes")
      .update({ is_approved: false })
      .eq("id", id);

    if (error) {
      setActionError(error.message);
    } else {
      setCafes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: false } : c))
      );
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    const confirmed = window.confirm(
      "This will permanently delete this cafe and its data. Are you sure?"
    );
    if (!confirmed) return;

    setProcessingId(id);
    setActionError("");

    const { error } = await supabase.from("cafes").delete().eq("id", id);

    if (error) {
      setActionError(error.message);
    } else {
      setCafes((prev) => prev.filter((c) => c.id !== id));
    }
    setProcessingId(null);
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2">Cafe Approvals</h1>
      <p className="text-gray-600 mb-6">Review, approve, or reject registered cafes.</p>

      {actionError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-600 text-sm mb-4">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading cafes...</p>
      ) : cafes.length === 0 ? (
        <p className="text-gray-500">No cafes registered yet.</p>
      ) : (
        <div className="space-y-4">
          {cafes.map((cafe) => (
            <div
              key={cafe.id}
              className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row gap-4"
            >
              <div className="w-full md:w-40 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {cafe.image_url ? (
                  <img
                    src={cafe.image_url}
                    alt={cafe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{cafe.name}</h3>
                  {cafe.is_approved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                      <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {cafe.address}, {cafe.city}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {cafe.description}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>₹{cafe.price_per_hour}/hour</span>
                  {cafe.email && <span>{cafe.email}</span>}
                  {cafe.phone && <span>{cafe.phone}</span>}
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 justify-center">
                {cafe.is_approved ? (
                  <Button
                    variant="outline"
                    disabled={processingId === cafe.id}
                    onClick={() => handleUnapprove(cafe.id)}
                  >
                    Unapprove
                  </Button>
                ) : (
                  <Button
                    disabled={processingId === cafe.id}
                    onClick={() => handleApprove(cafe.id)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700"
                  >
                    Approve
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={processingId === cafe.id}
                  onClick={() => handleReject(cafe.id)}
                  className="gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

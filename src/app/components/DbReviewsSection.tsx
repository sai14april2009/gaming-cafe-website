import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface DbReviewsSectionProps {
  cafeId: string;
  cafeName: string;
}

export function DbReviewsSection({ cafeId, cafeName }: DbReviewsSectionProps) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [cafeId]);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });

    if (data) {
      setReviews(data as Review[]);
      if (user) {
        const alreadyReviewed = data.some((r: any) => r.user_id === user.id);
        setHasReviewed(alreadyReviewed);
      }
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!comment.trim()) { setError("Please write a comment."); return; }
    setError("");
    setSubmitting(true);

    const { error: insertError } = await supabase.from("reviews").insert({
      cafe_id: cafeId,
      user_id: user?.id,
      user_name: profile?.full_name || user?.email || "Anonymous",
      rating,
      comment: comment.trim(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setComment("");
      setRating(5);
      setShowForm(false);
      setHasReviewed(true);
      fetchReviews();
    }
    setSubmitting(false);
  };

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>
          {averageRating && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${parseFloat(averageRating) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                ))}
              </div>
              <span className="text-sm text-gray-600">{averageRating} out of 5</span>
            </div>
          )}
        </div>

        {user && !hasReviewed && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Write a Review
          </Button>
        )}
        {!user && (
          <p className="text-sm text-gray-500">Sign in to write a review</p>
        )}
        {hasReviewed && (
          <p className="text-sm text-green-600 font-medium">✓ You've reviewed this cafe</p>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-5 mb-6 border-2 border-purple-200">
          <h3 className="font-semibold mb-4">Your Review for {cafeName}</h3>

          {/* Star Rating */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHoveredRating(s)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(s)}
                  className="focus:outline-none"
                >
                  <Star className={`w-8 h-8 transition-colors ${
                    (hoveredRating || rating) >= s
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 self-center">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hoveredRating || rating]}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your experience at this cafe..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-3">Review submitted!</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setError(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <p className="text-gray-500 text-center py-4">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                    {review.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{review.user_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${review.rating >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed pl-13 ml-13">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

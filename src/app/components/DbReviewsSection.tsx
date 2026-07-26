import { useState, useEffect } from "react";
import {
  Star,
  Pencil,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

type CategoryKey =
  | "rating_systems"
  | "rating_internet"
  | "rating_cleanliness"
  | "rating_staff"
  | "rating_value";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "rating_systems", label: "Gaming Systems" },
  { key: "rating_internet", label: "Internet Speed" },
  { key: "rating_cleanliness", label: "Cleanliness & Comfort" },
  { key: "rating_staff", label: "Staff & Service" },
  { key: "rating_value", label: "Value" },
];

interface Review {
  id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  rating_systems: number | null;
  rating_internet: number | null;
  rating_cleanliness: number | null;
  rating_staff: number | null;
  rating_value: number | null;
}

interface Reply {
  id: string;
  review_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface DbReviewsSectionProps {
  cafeId: string;
  cafeName: string;
}

// --- small presentational helpers -------------------------------------------

function StarInput({
  value,
  onChange,
  size = "w-6 h-6",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`${size} transition-colors ${
              (hover || value) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${value >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

function CategoryInputs({
  ratings,
  setRating,
}: {
  ratings: Record<string, number>;
  setRating: (key: CategoryKey, v: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      {CATEGORIES.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">{c.label}</span>
          <StarInput value={ratings[c.key] || 0} onChange={(v) => setRating(c.key, v)} />
        </div>
      ))}
    </div>
  );
}

function computeOverall(ratings: Record<string, number>): number {
  const filled = CATEGORIES.map((c) => ratings[c.key]).filter((v) => v && v > 0);
  if (filled.length === 0) return 0;
  return Math.round(filled.reduce((a, b) => a + b, 0) / filled.length);
}

function ratingsToColumns(ratings: Record<string, number>) {
  const out: Record<string, number | null> = {};
  for (const c of CATEGORIES) out[c.key] = ratings[c.key] > 0 ? ratings[c.key] : null;
  return out;
}

function reviewToRatings(r: Review): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CATEGORIES) out[c.key] = r[c.key] || 0;
  return out;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Avatar({ name, owner = false }: { name: string; owner?: boolean }) {
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
        owner ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-purple-600 to-pink-600"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function DbReviewsSection({ cafeId, cafeName }: DbReviewsSectionProps) {
  const { user, profile } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // create-review form
  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // edit own review
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRatings, setEditRatings] = useState<Record<string, number>>({});
  const [editComment, setEditComment] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // replies
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId, user?.id]);

  const fetchAll = async () => {
    setLoading(true);

    const { data: cafe } = await supabase
      .from("cafes")
      .select("owner_id")
      .eq("id", cafeId)
      .maybeSingle();
    setOwnerId(cafe?.owner_id ?? null);

    const { data: revs } = await supabase
      .from("reviews")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });
    const reviewList = (revs || []) as Review[];
    setReviews(reviewList);
    setHasReviewed(!!user && reviewList.some((r) => r.user_id === user.id));

    const ids = reviewList.map((r) => r.id);
    if (ids.length) {
      const { data: reps } = await supabase
        .from("review_replies")
        .select("*")
        .in("review_id", ids)
        .order("created_at", { ascending: true });
      setReplies((reps || []) as Reply[]);
    } else {
      setReplies([]);
    }

    if (user) {
      const { data: eligible } = await supabase.rpc("has_visited_cafe", { p_cafe_id: cafeId });
      setCanReview(!!eligible);
    } else {
      setCanReview(false);
    }

    setLoading(false);
  };

  const isOwner = !!user && !!ownerId && ownerId === user.id;
  const canReply = !!user && (canReview || isOwner);

  // --- create review ---------------------------------------------------------
  const handleSubmit = async () => {
    const overall = computeOverall(ratings);
    if (overall === 0) {
      setError("Please rate at least one category.");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a comment.");
      return;
    }
    if (!user) {
      setError("Please sign in to write a review.");
      return;
    }
    setError("");
    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("reviews")
      .insert({
        cafe_id: cafeId,
        user_id: user.id,
        user_name: profile?.full_name || user.email || "Anonymous",
        rating: overall,
        comment: comment.trim(),
        ...ratingsToColumns(ratings),
      })
      .select();
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError(
        "Could not submit — the insert was blocked (0 rows). Only customers who've completed a session here can review."
      );
      return;
    }
    setReviews((prev) => [data[0] as Review, ...prev]);
    setHasReviewed(true);
    setShowForm(false);
    setComment("");
    setRatings({});
  };

  // --- edit / delete own review ---------------------------------------------
  const startEdit = (r: Review) => {
    setEditingId(r.id);
    setEditRatings(reviewToRatings(r));
    setEditComment(r.comment);
    setEditError("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };
  const handleSaveEdit = async (r: Review) => {
    const overall = computeOverall(editRatings);
    if (overall === 0) {
      setEditError("Please rate at least one category.");
      return;
    }
    if (!editComment.trim()) {
      setEditError("Please write a comment.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    const { data, error } = await supabase
      .from("reviews")
      .update({ rating: overall, comment: editComment.trim(), ...ratingsToColumns(editRatings) })
      .eq("id", r.id)
      .select();
    setSavingEdit(false);
    if (error) {
      setEditError(`Could not save your changes: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setEditError("Could not save — update blocked (0 rows). You can only edit your own review.");
      return;
    }
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...(data[0] as Review) } : x)));
    setEditingId(null);
  };
  const handleDelete = async (r: Review) => {
    if (!window.confirm("Delete your review? This can't be undone.")) return;
    setDeletingId(r.id);
    const { data, error } = await supabase.from("reviews").delete().eq("id", r.id).select();
    setDeletingId(null);
    if (error) {
      alert(`Could not delete the review: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert("Could not delete — blocked (0 rows). You can only delete your own review.");
      return;
    }
    setReviews((prev) => prev.filter((x) => x.id !== r.id));
    setReplies((prev) => prev.filter((x) => x.review_id !== r.id));
    setHasReviewed(false);
  };

  // --- replies ---------------------------------------------------------------
  const toggleReplies = (reviewId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(reviewId) ? next.delete(reviewId) : next.add(reviewId);
      return next;
    });
  };
  const startReply = (reviewId: string) => {
    setReplyingTo(reviewId);
    setReplyText("");
    setReplyError("");
  };
  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      setReplyError("Please write a reply.");
      return;
    }
    if (!user) return;
    setReplyError("");
    setSubmittingReply(true);
    const { data, error } = await supabase
      .from("review_replies")
      .insert({
        review_id: reviewId,
        user_id: user.id,
        user_name: profile?.full_name || user.email || "Anonymous",
        comment: replyText.trim(),
      })
      .select();
    setSubmittingReply(false);
    if (error) {
      setReplyError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setReplyError(
        "Could not reply — blocked (0 rows). Only customers who've visited this cafe or the owner can reply."
      );
      return;
    }
    setReplies((prev) => [...prev, data[0] as Reply]);
    setExpanded((prev) => new Set(prev).add(reviewId));
    setReplyingTo(null);
    setReplyText("");
  };
  const startEditReply = (rep: Reply) => {
    setEditingReplyId(rep.id);
    setEditReplyText(rep.comment);
  };
  const handleSaveReply = async (rep: Reply) => {
    if (!editReplyText.trim()) return;
    setSavingReply(true);
    const { data, error } = await supabase
      .from("review_replies")
      .update({ comment: editReplyText.trim() })
      .eq("id", rep.id)
      .select();
    setSavingReply(false);
    if (error || !data || data.length === 0) {
      alert("Could not save the reply. You can only edit your own reply.");
      return;
    }
    setReplies((prev) => prev.map((x) => (x.id === rep.id ? { ...x, ...(data[0] as Reply) } : x)));
    setEditingReplyId(null);
  };
  const handleDeleteReply = async (rep: Reply) => {
    if (!window.confirm("Delete this reply?")) return;
    setDeletingReplyId(rep.id);
    const { data, error } = await supabase.from("review_replies").delete().eq("id", rep.id).select();
    setDeletingReplyId(null);
    if (error || !data || data.length === 0) {
      alert("Could not delete — you can only delete your own reply.");
      return;
    }
    setReplies((prev) => prev.filter((x) => x.id !== rep.id));
  };

  // --- derived ---------------------------------------------------------------
  const averageRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const categoryAverages = CATEGORIES.map((c) => {
    const vals = reviews.map((r) => r[c.key]).filter((v): v is number => !!v);
    return {
      ...c,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    };
  }).filter((c) => c.avg !== null);

  const repliesFor = (reviewId: string) => replies.filter((r) => r.review_id === reviewId);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>
          {averageRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay value={Math.round(parseFloat(averageRating))} />
              <span className="text-sm text-gray-600">{averageRating} out of 5</span>
            </div>
          )}
        </div>

        {!user && <p className="text-sm text-gray-500">Sign in to write a review</p>}
        {user && isOwner && (
          <p className="text-sm text-gray-500 max-w-[14rem] text-right">
            As the cafe owner you can reply to reviews, but not write one.
          </p>
        )}
        {user && !isOwner && !canReview && (
          <p className="text-sm text-gray-500 max-w-[15rem] text-right">
            Only customers who've completed a session here can leave a review.
          </p>
        )}
        {user && !isOwner && canReview && hasReviewed && (
          <p className="text-sm text-green-600 font-medium">✓ You've reviewed this cafe</p>
        )}
        {user && !isOwner && canReview && !hasReviewed && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Write a Review
          </Button>
        )}
      </div>

      {/* Cafe-level category averages (Airbnb-style) */}
      {categoryAverages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 mb-6 pb-6 border-b border-gray-100">
          {categoryAverages.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-600">{c.label}</span>
              <div className="flex items-center gap-1.5">
                <StarDisplay value={Math.round(c.avg as number)} size="w-3.5 h-3.5" />
                <span className="text-sm font-medium text-gray-700 tabular-nums w-7 text-right">
                  {(c.avg as number).toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-5 mb-6 border-2 border-purple-200">
          <h3 className="font-semibold mb-4">Your Review for {cafeName}</h3>
          <p className="text-sm text-gray-500 mb-3">Rate the categories that matter to you (at least one).</p>
          <CategoryInputs
            ratings={ratings}
            setRating={(key, v) => setRatings((prev) => ({ ...prev, [key]: v }))}
          />
          <div className="flex items-center gap-2 mt-4 mb-2 text-sm text-gray-600">
            <span className="font-medium">Overall:</span>
            {computeOverall(ratings) > 0 ? (
              <>
                <StarDisplay value={computeOverall(ratings)} />
                <span>{computeOverall(ratings)} / 5</span>
              </>
            ) : (
              <span className="text-gray-400">rate a category above</span>
            )}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Share your experience at this cafe..."
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none mt-2"
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
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

      {/* List */}
      {loading ? (
        <p className="text-gray-500 text-center py-4">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => {
            const isMine = !!user && review.user_id === user.id;
            const isEditing = editingId === review.id;
            const reviewReplies = repliesFor(review.id);
            const ownerReplied = !!ownerId && reviewReplies.some((r) => r.user_id === ownerId);
            const isExpanded = expanded.has(review.id);
            const shownCategories = CATEGORIES.filter((c) => review[c.key]);

            return (
              <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                {/* Head */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={review.user_name} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{review.user_name}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <BadgeCheck className="w-3.5 h-3.5" /> Verified booking
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  {!isEditing && <StarDisplay value={review.rating} />}
                </div>

                {ownerReplied && !isEditing && (
                  <p className="ml-13 mb-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                    <MessageSquare className="w-3.5 h-3.5" /> Cafe owner replied
                  </p>
                )}

                {isEditing ? (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-purple-200">
                    <CategoryInputs
                      ratings={editRatings}
                      setRating={(key, v) => setEditRatings((prev) => ({ ...prev, [key]: v }))}
                    />
                    <div className="flex items-center gap-2 mt-3 mb-2 text-sm text-gray-600">
                      <span className="font-medium">Overall:</span>
                      <StarDisplay value={computeOverall(editRatings)} />
                    </div>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"
                    />
                    {editError && <p className="text-red-600 text-sm mt-2">{editError}</p>}
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" className="flex-1" onClick={cancelEdit} disabled={savingEdit}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSaveEdit(review)}
                        disabled={savingEdit}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Category breakdown */}
                    {shownCategories.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                        {shownCategories.map((c) => (
                          <div key={c.key} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500">{c.label}</span>
                            <div className="flex items-center gap-1.5">
                              <StarDisplay value={review[c.key] as number} size="w-3 h-3" />
                              <span className="text-xs font-medium text-gray-600 tabular-nums w-2.5">
                                {review[c.key]}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-4 mt-3">
                      {isMine && (
                        <>
                          <button
                            onClick={() => startEdit(review)}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(review)}
                            disabled={deletingId === review.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingId === review.id ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      )}
                      {canReply && (
                        <button
                          onClick={() => startReply(review.id)}
                          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" /> Reply
                        </button>
                      )}
                    </div>

                    {/* Reply composer */}
                    {replyingTo === review.id && (
                      <div className="mt-3 ml-13">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Write a reply..."
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none text-sm"
                        />
                        {replyError && <p className="text-red-600 text-sm mt-1">{replyError}</p>}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyError("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReply(review.id)}
                            disabled={submittingReply}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            {submittingReply ? "Posting..." : "Reply"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies toggle + list */}
                    {reviewReplies.length > 0 && (
                      <div className="mt-3 ml-13">
                        <button
                          onClick={() => toggleReplies(review.id)}
                          className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isExpanded ? "Hide" : "View"} {reviewReplies.length}{" "}
                          {reviewReplies.length === 1 ? "reply" : "replies"}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-4">
                            {reviewReplies.map((rep) => {
                              const repIsOwner = !!ownerId && rep.user_id === ownerId;
                              const repIsMine = !!user && rep.user_id === user.id;
                              const repEditing = editingReplyId === rep.id;
                              return (
                                <div key={rep.id} className="flex items-start gap-3">
                                  <Avatar name={rep.user_name} owner={repIsOwner} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm">{rep.user_name}</p>
                                      {repIsOwner && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 rounded-full">
                                          Cafe Owner
                                        </span>
                                      )}
                                      <p className="text-xs text-gray-400">{formatDate(rep.created_at)}</p>
                                    </div>
                                    {repEditing ? (
                                      <div className="mt-1">
                                        <textarea
                                          value={editReplyText}
                                          onChange={(e) => setEditReplyText(e.target.value)}
                                          rows={2}
                                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none text-sm"
                                        />
                                        <div className="flex gap-2 mt-1.5">
                                          <Button variant="outline" size="sm" onClick={() => setEditingReplyId(null)} disabled={savingReply}>
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveReply(rep)}
                                            disabled={savingReply}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                          >
                                            {savingReply ? "Saving..." : "Save"}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-gray-700 text-sm leading-relaxed mt-0.5">{rep.comment}</p>
                                        {repIsMine && (
                                          <div className="flex gap-3 mt-1.5">
                                            <button
                                              onClick={() => startEditReply(rep)}
                                              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-purple-600"
                                            >
                                              <Pencil className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteReply(rep)}
                                              disabled={deletingReplyId === rep.id}
                                              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              {deletingReplyId === rep.id ? "Deleting..." : "Delete"}
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CornerDownRight,
  ThumbsUp,
  User,
} from 'lucide-react';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: Date | string;
  customerName: string;
}

interface ProductReviewsProps {
  productId: string;
  productTitle: string;
  initialReviews: ReviewItem[];
  initialMetrics: {
    averageRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
    distributionPercentages: Record<number, number>;
  };
  currentUser?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  isVerifiedBuyer?: boolean;
  existingReview?: {
    rating: number;
    title: string | null;
    comment: string;
  } | null;
}

export function ProductReviews({
  productId,
  productTitle,
  initialReviews,
  initialMetrics,
  currentUser,
  isVerifiedBuyer = false,
  existingReview = null,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>(existingReview?.title || '');
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 3) {
      setMessage({ text: 'Review comment must be at least 3 characters.', error: true });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      setMessage({ text: 'Thank you! Your verified review has been published.' });
      setIsFormOpen(false);

      // Refresh reviews list
      const updatedRes = await fetch(`/api/products/${productId}/reviews`);
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setReviews(updatedData.reviews);
        setMetrics(updatedData.metrics);
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error submitting review', error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pt-12 border-t border-slate-800" id="reviews">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <MessageSquare className="w-4 h-4" />
            Customer Feedback
          </div>
          <h2 className="text-2xl font-black text-white">Ratings & Reviews</h2>
        </div>

        <div>
          {currentUser ? (
            <Button
              size="sm"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="gap-2 shadow-lg shadow-blue-500/20 text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {existingReview ? 'Update Your Review' : 'Write a Review'}
            </Button>
          ) : (
            <Link href={`/login?redirect=/products/${productId}#reviews`}>
              <Button size="sm" variant="outline" className="border-slate-700 text-xs gap-1.5">
                <User className="w-3.5 h-3.5" />
                Sign In to Review
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Ratings Overview Card */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Overall Score (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
              <span className="text-5xl font-black text-white tracking-tight">
                {metrics.totalReviews > 0 ? metrics.averageRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center gap-1 mt-2 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(metrics.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Based on <strong className="text-white">{metrics.totalReviews}</strong> customer review
                {metrics.totalReviews === 1 ? '' : 's'}
              </p>
              {isVerifiedBuyer && (
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] font-medium text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  You own this product (Verified Buyer)
                </div>
              )}
            </div>

            {/* Right: Distribution Breakdown (7 cols) */}
            <div className="md:col-span-7 space-y-2.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = metrics.distribution[stars] || 0;
                const percentage = metrics.distributionPercentages[stars] || 0;

                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-medium text-slate-300 flex items-center gap-1">
                      {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-400 font-mono text-[11px]">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Submission Form (Expandable) */}
      {isFormOpen && (
        <Card className="border-blue-500/40 bg-slate-900/90 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Write Your Review for {productTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    message.error
                      ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                  }`}
                >
                  {message.error ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Overall Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-700 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">
                    {hoverRating || rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Headline */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Headline / Summary (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excellent template, saved me 40+ hours!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="What did you like or dislike? How was the code quality, ease of setup, and documentation?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 text-right mt-1">
                  {comment.length} / 2000 characters
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  {submitting ? 'Publishing...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No reviews yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Be the first to share your thoughts on {productTitle}!
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <Card key={rev.id} className="border-slate-800/80 bg-slate-900/60 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                      {rev.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{rev.customerName}</span>
                        {rev.isVerifiedPurchase && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.title && (
                  <h4 className="text-sm font-bold text-white mt-3">{rev.title}</h4>
                )}

                <p className="text-xs text-slate-300 leading-relaxed mt-2 whitespace-pre-line">
                  {rev.comment}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

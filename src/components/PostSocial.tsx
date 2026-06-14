"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Comment = {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Likes + comments for a single post, rendered under the post in the dark feed.
// Likes use the browser Supabase client directly (RLS enforces one like per
// user); commenting posts through /api/posts/[id]/comments so the owner can be
// emailed. Reads + own-comment deletes also go through RLS on the client.
export function PostSocial({ postId }: { postId: string }) {
  const supabaseRef = useRef(createBrowserSupabaseClient());
  const supabase = supabaseRef.current;

  const [userId, setUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLikes = useCallback(
    async (uid: string | null) => {
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      setLikeCount(count ?? 0);
      if (uid) {
        const { data } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", uid)
          .maybeSingle();
        setLiked(Boolean(data));
      } else {
        setLiked(false);
      }
    },
    [supabase, postId],
  );

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, author_name, body, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  }, [supabase, postId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      loadLikes(uid);
    });
    loadComments();
    return () => {
      active = false;
    };
  }, [supabase, loadLikes, loadComments]);

  async function toggleLike() {
    if (!userId || likeBusy) return;
    setLikeBusy(true);
    // Optimistic update.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (result.error) {
      // Roll back on failure.
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
    setLikeBusy(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const { comment } = (await res.json()) as { comment: Comment };
      setComments((prev) => [...prev, comment]);
      setDraft("");
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Could not post comment.");
    }
    setPosting(false);
  }

  async function deleteComment(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const { error: delErr } = await supabase.from("post_comments").delete().eq("id", id);
    if (delErr) setComments(prev); // restore on failure
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex items-center gap-4 text-sm">
        {userId ? (
          <button
            type="button"
            onClick={toggleLike}
            disabled={likeBusy}
            className={`inline-flex items-center gap-1.5 transition-colors ${
              liked ? "text-rose-400" : "text-stone-300 hover:text-rose-300"
            }`}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden="true" />
            <span className="tabular-nums">{likeCount}</span>
          </button>
        ) : (
          <Link href="/account" className="inline-flex items-center gap-1.5 text-stone-300 hover:text-rose-300">
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{likeCount}</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="inline-flex items-center gap-1.5 text-stone-300 transition-colors hover:text-stone-100"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">{comments.length}</span>
        </button>
      </div>

      {showComments ? (
        <div className="mt-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-stone-500">No comments yet — be the first.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="group text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-stone-100">{c.author_name}</span>
                  <span className="text-[11px] text-stone-500">{formatWhen(c.created_at)}</span>
                  {c.user_id === userId ? (
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      className="ml-auto text-stone-500 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-0.5 whitespace-pre-line leading-6 text-stone-200">{c.body}</p>
              </div>
            ))
          )}

          {userId ? (
            <form onSubmit={submitComment} className="mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Add a comment…"
                className="w-full resize-none rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 outline-none focus:border-white/30"
              />
              <div className="mt-1.5 flex items-center justify-between">
                {error ? <span className="text-xs text-rose-400">{error}</span> : <span />}
                <button
                  type="submit"
                  disabled={posting || !draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-100 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                  Post
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-stone-500">
              <Link href="/account" className="font-semibold text-emerald-400 hover:text-emerald-300">
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

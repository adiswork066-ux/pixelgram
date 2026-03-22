import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, MessageSquareQuote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  getFeedbackPrompt,
  getFeedbackStyleMeta,
  getIntentMeta,
} from "@/lib/socialFeatures";

const CommentsSection = ({
  postId,
  versionId,
  versionNumber,
  intent,
  feedbackStyle,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const { user: currentUser, api } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const intentMeta = getIntentMeta(intent);
  const feedbackMeta = getFeedbackStyleMeta(feedbackStyle);
  const commentPrompt = getFeedbackPrompt(intent, feedbackStyle);

  const fetchComments = useCallback(async () => {
    if (!versionId) return;

    try {
      setLoading(true);
      const response = await api().get(
        `/posts/${postId}/comments?version_id=${encodeURIComponent(versionId)}`,
      );
      setComments(response.data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [api, postId, versionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newComment.trim() || submitting || !versionId) return;

    setSubmitting(true);
    try {
      const response = await api().post(
        `/posts/${postId}/comments?version_id=${encodeURIComponent(versionId)}`,
        { text: newComment },
      );
      setComments((previous) => [response.data, ...previous]);
      setNewComment("");
      onCommentAdded?.(response.data);
    } catch (error) {
      toast.error("Failed to add feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api().delete(`/comments/${commentId}`);
      setComments((previous) => previous.filter((comment) => comment.id !== commentId));
      onCommentDeleted?.(commentId);
      toast.success("Feedback deleted");
    } catch (error) {
      toast.error("Failed to delete feedback");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border p-4 space-y-4 ${intentMeta.panelClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Feedback on v{versionNumber}
          </p>
          <h3 className="mt-1 font-heading text-lg font-semibold">
            Version-specific discussion
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{commentPrompt}</p>
        </div>

        {intent === "feedback" && (
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 border-white/10 bg-background/50"
          >
            {feedbackMeta.label}
          </Badge>
        )}
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto hide-scrollbar pr-1">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-5 text-sm text-muted-foreground">
            No feedback on this version yet. Start with what is working and what should
            improve next.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 group rounded-2xl bg-background/45 p-3"
              data-testid={`comment-${comment.id}`}
            >
              <Link to={`/profile/${comment.username}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback className="text-xs">
                    {comment.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <p className="text-sm leading-6">
                  <Link
                    to={`/profile/${comment.username}`}
                    className="font-semibold hover:underline mr-2"
                  >
                    {comment.username}
                  </Link>
                  {comment.text}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquareQuote className="w-3 h-3" />
                    v{comment.version_number || versionNumber}
                  </span>
                </div>
              </div>
              {currentUser?.id === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive"
                  data-testid={`delete-comment-${comment.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          placeholder={commentPrompt}
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          className="flex-1 h-11 rounded-2xl bg-background/70 border-white/10 text-sm"
          disabled={submitting}
          data-testid="comment-input"
        />
        <Button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="h-11 px-5 rounded-2xl"
          data-testid="submit-comment-btn"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Respond"}
        </Button>
      </form>
    </div>
  );
};

export default CommentsSection;

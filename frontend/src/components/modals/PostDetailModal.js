import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EchoWall from "@/components/post/EchoWall";
import { getMoodMeta } from "@/lib/socialFeatures";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Loader2,
  Trash2,
  X,
  Layers3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PostDetailModal = ({ post: initialPost, open, onClose }) => {
  const { user: currentUser, api } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(initialPost.is_liked);
  const [likesCount, setLikesCount] = useState(initialPost.likes_count);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);

  const moodMeta = getMoodMeta(post.mood);

  useEffect(() => {
    setPost(initialPost);
    setLiked(initialPost.is_liked);
    setLikesCount(initialPost.likes_count);
  }, [initialPost]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api().get(`/posts/${initialPost.id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [api, initialPost.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!liked);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 600);

    try {
      const response = await api().post(`/posts/${post.id}/like`);
      setLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
      setPost((prev) => ({
        ...prev,
        is_liked: response.data.liked,
        likes_count: response.data.likes_count,
      }));
    } catch (error) {
      setLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      toast.error("Failed to update like");
    }
  };

  const handleDoubleClick = () => {
    if (!liked) {
      handleLike();
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await api().post(`/posts/${post.id}/comments`, {
        text: newComment,
      });
      setComments((prev) => [response.data, ...prev]);
      setPost((prev) => ({
        ...prev,
        comments_count: (prev.comments_count || 0) + 1,
      }));
      setNewComment("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api().delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((prev) => ({
        ...prev,
        comments_count: Math.max((prev.comments_count || 1) - 1, 0),
      }));
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleEchoUpdate = (updates) => {
    setPost((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-[86vh] md:h-[76vh]">
          <div
            className="relative w-full md:w-[54%] bg-black flex items-center justify-center"
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={post.image}
              alt={post.caption || "Post"}
              className="w-full h-full object-contain"
            />
            <div
              className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${moodMeta.gradientClass}`}
            />
            {animateHeart && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="w-24 h-24 text-white fill-white heart-animation drop-shadow-lg" />
              </div>
            )}
          </div>

          <div className="w-full md:w-[46%] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link
                to={`/profile/${post.username}`}
                className="flex items-center gap-3"
                onClick={onClose}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user_avatar} />
                  <AvatarFallback>{post.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm hover:underline">
                      {post.username}
                    </p>
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2.5 py-0.5 ${moodMeta.badgeClass}`}
                    >
                      {moodMeta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </Link>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {post.caption && (
                <div className="space-y-2">
                  <p className="text-sm leading-6">
                    <Link
                      to={`/profile/${post.username}`}
                      className="font-semibold hover:underline mr-2"
                      onClick={onClose}
                    >
                      {post.username}
                    </Link>
                    {post.caption}
                  </p>
                </div>
              )}

              {post.backstory && (
                <div className={`rounded-2xl border p-4 ${moodMeta.panelClass}`}>
                  <button
                    type="button"
                    onClick={() => setShowBackstory((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-full bg-background/60 flex items-center justify-center">
                        <Layers3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Behind the Frame</p>
                        <p className="text-xs text-muted-foreground">
                          The hidden context behind this image
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`rounded-full px-3 py-1 ${moodMeta.badgeClass}`}
                    >
                      {showBackstory ? "Hide" : "Reveal"}
                    </Badge>
                  </button>
                  {showBackstory && (
                    <p className="text-sm leading-6 mt-4 animate-fade-in-up">
                      {post.backstory}
                    </p>
                  )}
                </div>
              )}

              <EchoWall
                postId={post.id}
                mood={post.mood}
                initialEchoCount={post.echo_count || 0}
                initialTopEchoes={post.top_echoes || []}
                initialUserEcho={post.user_echo || null}
                detailed
                onUpdate={handleEchoUpdate}
              />

              <div className="space-y-4 pt-2 border-t border-border/50">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Discussion
                </p>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No comments yet. Start the conversation.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <Link to={`/profile/${comment.username}`} onClick={onClose}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user_avatar} />
                          <AvatarFallback className="text-xs">
                            {comment.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <p className="text-sm">
                          <Link
                            to={`/profile/${comment.username}`}
                            className="font-semibold hover:underline mr-2"
                            onClick={onClose}
                          >
                            {comment.username}
                          </Link>
                          {comment.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {currentUser?.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={handleLike} className="btn-press transition-transform">
                    <Heart
                      className={`w-7 h-7 transition-all ${
                        liked
                          ? "fill-like text-like scale-110"
                          : "text-foreground hover:text-muted-foreground"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <button className="btn-press transition-transform">
                    <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
                  </button>
                  <button className="btn-press transition-transform">
                    <Send className="w-6 h-6" strokeWidth={1.5} />
                  </button>
                </div>
                <button className="btn-press transition-transform">
                  <Bookmark className="w-7 h-7" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <p className="font-semibold">{likesCount.toLocaleString()} likes</p>
                <span className="text-muted-foreground">
                  {(post.echo_count || 0).toLocaleString()} echoes
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmitComment}
              className="border-t border-border p-4 flex gap-2"
            >
              <Input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 h-10 rounded-xl bg-secondary border-none text-sm"
                disabled={submitting}
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="h-10 px-4 rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailModal;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CommentsSection from "@/components/post/CommentsSection";
import CreatePostModal from "@/components/modals/CreatePostModal";
import {
  getFeedbackStyleMeta,
  getIntentCTA,
  getIntentMeta,
} from "@/lib/socialFeatures";
import {
  Heart,
  Loader2,
  X,
  GitBranchPlus,
  MessageCircleMore,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PostDetailModal = ({ post: initialPost, open, onClose, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const { user: currentUser, api } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(initialPost?.is_liked);
  const [likesCount, setLikesCount] = useState(initialPost?.likes_count || 0);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(
    initialPost?.active_version_id || initialPost?.versions?.[initialPost?.versions?.length - 1]?.id,
  );

  useEffect(() => {
    setPost(initialPost);
    setLiked(initialPost?.is_liked);
    setLikesCount(initialPost?.likes_count || 0);
    setSelectedVersionId(
      initialPost?.active_version_id ||
        initialPost?.versions?.[initialPost?.versions?.length - 1]?.id,
    );
  }, [initialPost]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!open || !initialPost?.id) return;

      try {
        setLoading(true);
        const response = await api().get(`/posts/${initialPost.id}`);
        setPost(response.data);
        setLiked(response.data.is_liked);
        setLikesCount(response.data.likes_count);
        setSelectedVersionId(response.data.active_version_id);
      } catch (error) {
        console.error("Failed to fetch Pixel:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [api, initialPost?.id, open]);

  const isOwnPixel = currentUser?.id === post?.user_id;
  const intentMeta = getIntentMeta(post?.intent);
  const feedbackMeta = getFeedbackStyleMeta(post?.feedback_style);
  const versions = useMemo(() => post?.versions || [], [post?.versions]);

  const selectedVersion = useMemo(() => {
    if (!versions.length) return null;
    return (
      versions.find((version) => version.id === selectedVersionId) ||
      versions[versions.length - 1]
    );
  }, [selectedVersionId, versions]);

  const updateLocalPost = (nextPost) => {
    setPost(nextPost);
    setLiked(nextPost.is_liked);
    setLikesCount(nextPost.likes_count);
    onUpdate?.(nextPost.id, nextPost);
  };

  const handleLike = async () => {
    if (!post) return;

    const wasLiked = liked;
    setLiked(!liked);
    setLikesCount((previous) => (liked ? previous - 1 : previous + 1));
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 600);

    try {
      const response = await api().post(`/posts/${post.id}/like`);
      const nextPost = {
        ...post,
        is_liked: response.data.liked,
        likes_count: response.data.likes_count,
      };
      updateLocalPost(nextPost);
    } catch (error) {
      setLiked(wasLiked);
      setLikesCount((previous) => (wasLiked ? previous + 1 : previous - 1));
      toast.error("Failed to update support");
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm("Delete this Pixel and every version inside it?")) return;

    setDeleting(true);
    try {
      await api().delete(`/posts/${post.id}`);
      toast.success("Pixel deleted");
      onDelete?.(post.id);
      onClose?.();
    } catch (error) {
      toast.error("Failed to delete Pixel");
      setDeleting(false);
    }
  };

  const handleCommentAdded = () => {
    if (!post || !selectedVersion) return;

    const nextVersions = post.versions.map((version) =>
      version.id === selectedVersion.id
        ? { ...version, comments_count: (version.comments_count || 0) + 1 }
        : version,
    );
    const activeVersion =
      nextVersions.find((version) => version.id === post.active_version_id) ||
      nextVersions[nextVersions.length - 1];

    updateLocalPost({
      ...post,
      versions: nextVersions,
      comments_count: activeVersion?.comments_count || 0,
    });
  };

  const handleCommentDeleted = () => {
    if (!post || !selectedVersion) return;

    const nextVersions = post.versions.map((version) =>
      version.id === selectedVersion.id
        ? { ...version, comments_count: Math.max((version.comments_count || 1) - 1, 0) }
        : version,
    );
    const activeVersion =
      nextVersions.find((version) => version.id === post.active_version_id) ||
      nextVersions[nextVersions.length - 1];

    updateLocalPost({
      ...post,
      versions: nextVersions,
      comments_count: activeVersion?.comments_count || 0,
    });
  };

  const handleVersionCreated = (updatedPixel) => {
    updateLocalPost(updatedPixel);
    setSelectedVersionId(updatedPixel.active_version_id);
  };

  const handleConnect = () => {
    if (!post) return;
    navigate(`/messages/${post.user_id}`);
  };

  if (!post) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-[70vh]">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row h-[86vh]">
              <div
                className="relative w-full lg:w-[56%] bg-black flex items-center justify-center"
                onDoubleClick={handleLike}
              >
                {selectedVersion && (
                  <img
                    src={selectedVersion.image}
                    alt={selectedVersion.caption || post.title}
                    className="w-full h-full object-contain"
                  />
                )}
                <div
                  className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${intentMeta.gradientClass}`}
                />
                {animateHeart && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="w-24 h-24 text-white fill-white heart-animation drop-shadow-lg" />
                  </div>
                )}
              </div>

              <div className="w-full lg:w-[44%] flex flex-col border-l border-border/50">
                <div className="flex items-center justify-between p-5 border-b border-border/50">
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
                        <p className="font-semibold text-sm hover:underline">{post.username}</p>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 ${intentMeta.badgeClass}`}
                        >
                          {intentMeta.label}
                        </Badge>
                        {post.intent === "feedback" && (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-0.5 border-white/10 bg-background/45"
                          >
                            {feedbackMeta.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated{" "}
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>

                  <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Pixel workspace
                        </p>
                        <h2 className="font-heading text-2xl leading-tight mt-1">
                          {post.title}
                        </h2>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        v{post.latest_version_number} of {post.versions_count}
                      </Badge>
                    </div>

                    {post.creative_goal && (
                      <div className={`rounded-3xl border p-4 ${intentMeta.panelClass}`}>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Creative intent
                        </p>
                        <p className="text-sm leading-6 mt-2">{post.creative_goal}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Evolution timeline
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Switch versions to inspect progress
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {versions.map((version) => {
                        const active = version.id === selectedVersion?.id;
                        return (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => setSelectedVersionId(version.id)}
                            className={`rounded-2xl border px-3 py-2 text-left transition-all ${
                              active
                                ? intentMeta.badgeClass
                                : "border-border bg-background/45 hover:bg-secondary/60"
                            }`}
                          >
                            <div className="text-sm font-semibold">
                              v{version.version_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {version.comments_count || 0} feedback notes
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedVersion && (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-white/10 bg-background/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Version v{selectedVersion.version_number}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Added{" "}
                              {formatDistanceToNow(new Date(selectedVersion.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {selectedVersion.id === post.active_version_id && (
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              Latest
                            </Badge>
                          )}
                        </div>

                        {selectedVersion.caption && (
                          <p className="text-sm leading-6 mt-4">{selectedVersion.caption}</p>
                        )}

                        {selectedVersion.version_note && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              What changed
                            </p>
                            <p className="text-sm leading-6 mt-2">
                              {selectedVersion.version_note}
                            </p>
                          </div>
                        )}
                      </div>

                      {post.intent === "collaborate" && !isOwnPixel && (
                        <div className={`rounded-3xl border p-4 ${intentMeta.panelClass}`}>
                          <p className="text-sm leading-6">
                            This Pixel is open for collaboration. If you want to help shape the
                            next version, reach out directly.
                          </p>
                          <Button
                            onClick={handleConnect}
                            className="mt-3 rounded-2xl"
                          >
                            {getIntentCTA(post.intent)}
                          </Button>
                        </div>
                      )}

                      <CommentsSection
                        postId={post.id}
                        versionId={selectedVersion.id}
                        versionNumber={selectedVersion.version_number}
                        intent={post.intent}
                        feedbackStyle={post.feedback_style}
                        onCommentAdded={handleCommentAdded}
                        onCommentDeleted={handleCommentDeleted}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-border/50 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={handleLike} className="btn-press transition-transform">
                        <Heart
                          className={`w-7 h-7 transition-all ${
                            liked ? "fill-like text-like scale-110" : "text-foreground"
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                      <div>
                        <p className="text-sm font-semibold">
                          {likesCount.toLocaleString()} appreciations
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Keep this secondary. Growth matters more than vanity metrics.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwnPixel && (
                        <Button
                          onClick={() => setShowAddVersion(true)}
                          className="rounded-2xl"
                        >
                          <GitBranchPlus className="w-4 h-4 mr-2" />
                          Add New Version
                        </Button>
                      )}
                      {isOwnPixel && (
                        <Button
                          variant="outline"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="rounded-2xl"
                        >
                          {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {!isOwnPixel && (
                        <Button
                          variant="outline"
                          onClick={handleConnect}
                          className="rounded-2xl"
                        >
                          <MessageCircleMore className="w-4 h-4 mr-2" />
                          {getIntentCTA(post.intent)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showAddVersion && (
        <CreatePostModal
          open={showAddVersion}
          onClose={() => setShowAddVersion(false)}
          pixel={post}
          onSuccess={handleVersionCreated}
        />
      )}
    </>
  );
};

export default PostDetailModal;

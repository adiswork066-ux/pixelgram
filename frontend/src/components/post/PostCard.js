import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MoreHorizontal,
  Trash2,
  GitBranchPlus,
  MessageSquareQuote,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  getFeedbackStyleMeta,
  getIntentCTA,
  getIntentMeta,
} from "@/lib/socialFeatures";

const PostCard = ({ post, onUpdate, onDelete, onOpen }) => {
  const navigate = useNavigate();
  const { user: currentUser, api } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [deleting, setDeleting] = useState(false);

  const isOwnPixel = currentUser?.id === post.user_id;
  const intentMeta = getIntentMeta(post.intent);
  const feedbackMeta = getFeedbackStyleMeta(post.feedback_style);

  useEffect(() => {
    setLiked(post.is_liked);
    setLikesCount(post.likes_count);
  }, [post.is_liked, post.likes_count]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!liked);
    setLikesCount((previous) => (liked ? previous - 1 : previous + 1));

    try {
      const response = await api().post(`/posts/${post.id}/like`);
      const nextPost = {
        ...post,
        is_liked: response.data.liked,
        likes_count: response.data.likes_count,
      };
      setLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
      onUpdate?.(post.id, nextPost);
    } catch (error) {
      setLiked(wasLiked);
      setLikesCount((previous) => (wasLiked ? previous + 1 : previous - 1));
      toast.error("Failed to update support");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this Pixel and all of its versions?")) return;

    setDeleting(true);
    try {
      await api().delete(`/posts/${post.id}`);
      toast.success("Pixel deleted");
      onDelete?.(post.id);
    } catch (error) {
      toast.error("Failed to delete Pixel");
      setDeleting(false);
    }
  };

  const handleConnect = () => {
    navigate(`/messages/${post.user_id}`);
  };

  return (
    <article
      className="bg-card border border-border/50 rounded-[28px] overflow-hidden shadow-sm"
      data-testid={`post-card-${post.id}`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${intentMeta.gradientClass}`} />

      <div className="flex items-start justify-between p-5">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3 min-w-0">
          <Avatar className="w-11 h-11">
            <AvatarImage src={post.user_avatar} />
            <AvatarFallback>{post.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm hover:underline truncate">{post.username}</p>
              <Badge
                variant="outline"
                className={`rounded-full px-2.5 py-0.5 ${intentMeta.badgeClass}`}
              >
                {intentMeta.label}
              </Badge>
              {post.intent === "feedback" && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 py-0.5 border-white/10 bg-background/50"
                >
                  {feedbackMeta.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>

        {isOwnPixel && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                disabled={deleting}
                data-testid="delete-post-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete Pixel"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(post)}
        className="w-full text-left"
      >
        <div className="px-5 pb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Pixel
              </p>
              <h2 className="font-heading text-2xl leading-tight mt-1">{post.title}</h2>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 shrink-0">
              v{post.latest_version_number} of {post.versions_count}
            </Badge>
          </div>

          {post.creative_goal && (
            <p className="text-sm text-muted-foreground leading-6 mb-4">
              {post.creative_goal}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {post.versions?.map((version) => (
              <Badge
                key={version.id}
                variant="outline"
                className={`rounded-full px-3 py-1 ${
                  version.id === post.active_version_id
                    ? intentMeta.badgeClass
                    : "border-white/10 bg-background/45"
                }`}
              >
                v{version.version_number}
              </Badge>
            ))}
          </div>
        </div>

        <div className="px-5">
          <img
            src={post.image}
            alt={post.caption || post.title}
            className="w-full aspect-[16/11] object-cover rounded-[24px]"
          />
        </div>
      </button>

      <div className="p-5 space-y-4">
        {post.caption && <p className="text-sm leading-6">{post.caption}</p>}

        {post.version_note && (
          <div className={`rounded-3xl border p-4 ${intentMeta.panelClass}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Latest progress note
            </p>
            <p className="text-sm leading-6 mt-2">{post.version_note}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={handleLike}
              className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${liked ? "fill-like text-like" : "text-current"}`}
              />
              {likesCount} appreciations
            </button>
            <span className="inline-flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4" />
              {post.comments_count} notes on latest version
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isOwnPixel && post.intent === "collaborate" && (
              <Button variant="outline" onClick={handleConnect} className="rounded-2xl">
                {getIntentCTA(post.intent)}
              </Button>
            )}
            {isOwnPixel && (
              <Badge variant="outline" className="rounded-full px-3 py-1 border-white/10">
                <GitBranchPlus className="w-3.5 h-3.5 mr-1" />
                Add versions from inside
              </Badge>
            )}
            <Button onClick={() => onOpen?.(post)} className="rounded-2xl">
              Open Pixel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;

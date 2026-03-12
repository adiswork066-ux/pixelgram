import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import CommentsSection from './CommentsSection';

const PostCard = ({ post, onUpdate, onDelete }) => {
    const { user: currentUser, api } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [liked, setLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const [commentsCount, setCommentsCount] = useState(post.comments_count);
    const [animateHeart, setAnimateHeart] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwnPost = currentUser?.id === post.user_id;

    const handleLike = async () => {
        const wasLiked = liked;
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        setAnimateHeart(true);
        setTimeout(() => setAnimateHeart(false), 600);

        try {
            const response = await api().post(`/posts/${post.id}/like`);
            setLiked(response.data.liked);
            setLikesCount(response.data.likes_count);
            onUpdate?.(post.id, { is_liked: response.data.liked, likes_count: response.data.likes_count });
        } catch (error) {
            setLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
            toast.error('Failed to update like');
        }
    };

    const handleDoubleClick = () => {
        if (!liked) {
            handleLike();
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        
        setDeleting(true);
        try {
            await api().delete(`/posts/${post.id}`);
            toast.success('Post deleted');
            onDelete?.(post.id);
        } catch (error) {
            toast.error('Failed to delete post');
            setDeleting(false);
        }
    };

    const handleCommentAdded = () => {
        setCommentsCount(prev => prev + 1);
        onUpdate?.(post.id, { comments_count: commentsCount + 1 });
    };

    return (
        <article className="bg-card border border-border/50 rounded-2xl overflow-hidden" data-testid={`post-card-${post.id}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <Link to={`/profile/${post.username}`} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={post.user_avatar} />
                        <AvatarFallback>{post.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm hover:underline">{post.username}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </Link>

                {isOwnPost && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full" data-testid="post-menu-btn">
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
                                {deleting ? 'Deleting...' : 'Delete Post'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Image */}
            <div 
                className="relative aspect-square bg-secondary cursor-pointer"
                onDoubleClick={handleDoubleClick}
            >
                <img 
                    src={post.image} 
                    alt={post.caption || 'Post'} 
                    className="w-full h-full object-cover"
                />
                {animateHeart && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Heart className="w-24 h-24 text-white fill-white heart-animation drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLike}
                            className="btn-press transition-transform"
                            data-testid="like-btn"
                        >
                            <Heart 
                                className={`w-7 h-7 transition-all ${
                                    liked 
                                        ? 'fill-like text-like scale-110' 
                                        : 'text-foreground hover:text-muted-foreground'
                                } ${animateHeart ? 'heart-animation' : ''}`}
                                strokeWidth={1.5}
                            />
                        </button>
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className="btn-press transition-transform"
                            data-testid="comment-btn"
                        >
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

                {/* Likes count */}
                <p className="font-semibold text-sm">{likesCount.toLocaleString()} likes</p>

                {/* Caption */}
                {post.caption && (
                    <p className="text-sm">
                        <Link to={`/profile/${post.username}`} className="font-semibold hover:underline mr-2">
                            {post.username}
                        </Link>
                        {post.caption}
                    </p>
                )}

                {/* Comments toggle */}
                {commentsCount > 0 && !showComments && (
                    <button 
                        onClick={() => setShowComments(true)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                        data-testid="view-comments-btn"
                    >
                        View all {commentsCount} comments
                    </button>
                )}

                {/* Comments Section */}
                {showComments && (
                    <CommentsSection 
                        postId={post.id} 
                        onCommentAdded={handleCommentAdded}
                    />
                )}
            </div>
        </article>
    );
};

export default PostCard;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const CommentsSection = ({ postId, onCommentAdded }) => {
    const { user: currentUser, api } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api().get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    }, [api, postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const response = await api().post(`/posts/${postId}/comments`, { text: newComment });
            setComments(prev => [response.data, ...prev]);
            setNewComment('');
            onCommentAdded?.();
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api().delete(`/comments/${commentId}`);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (error) {
            toast.error('Failed to delete comment');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-2 border-t border-border/50">
            {/* Comments List */}
            <div className="space-y-3 max-h-64 overflow-y-auto hide-scrollbar">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group" data-testid={`comment-${comment.id}`}>
                        <Link to={`/profile/${comment.username}`}>
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={comment.user_avatar} />
                                <AvatarFallback className="text-xs">{comment.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex-1">
                            <p className="text-sm">
                                <Link to={`/profile/${comment.username}`} className="font-semibold hover:underline mr-2">
                                    {comment.username}
                                </Link>
                                {comment.text}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </p>
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
                ))}
            </div>

            {/* Add Comment */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-secondary border-none text-sm"
                    disabled={submitting}
                    data-testid="comment-input"
                />
                <Button 
                    type="submit" 
                    disabled={!newComment.trim() || submitting}
                    className="h-10 px-4 rounded-xl"
                    data-testid="submit-comment-btn"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                </Button>
            </form>
        </div>
    );
};

export default CommentsSection;

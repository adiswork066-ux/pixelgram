import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/post/PostCard';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers3, Sparkles, Radar } from 'lucide-react';

const HomePage = () => {
    const { api } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPosts = useCallback(async (pageNum = 1) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const response = await api().get(`/posts?page=${pageNum}&page_size=10`);
            
            if (pageNum === 1) {
                setPosts(response.data);
            } else {
                setPosts(prev => [...prev, ...response.data]);
            }
            
            setHasMore(response.data.length === 10);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [api]);

    useEffect(() => {
        fetchPosts(1);
    }, [fetchPosts]);

    const handleScroll = useCallback(() => {
        if (
            window.innerHeight + document.documentElement.scrollTop
            >= document.documentElement.offsetHeight - 500
            && hasMore
            && !loadingMore
        ) {
            setPage(prev => prev + 1);
        }
    }, [hasMore, loadingMore]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        if (page > 1) {
            fetchPosts(page);
        }
    }, [page, fetchPosts]);

    const handlePostUpdate = (postId, updates) => {
        setPosts(prev => prev.map(post => 
            post.id === postId ? { ...post, ...updates } : post
        ));
    };

    const handlePostDelete = (postId) => {
        setPosts(prev => prev.filter(post => post.id !== postId));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-screen-md mx-auto px-4 py-6" data-testid="home-page">
            <div className="space-y-6 stagger-children">
                <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.78))] p-6 text-white shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-xl space-y-3">
                            <Badge variant="outline" className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white/90">
                                Professor demo mode
                            </Badge>
                            <div className="space-y-2">
                                <h1 className="font-heading text-3xl leading-tight">
                                    Pixelgram is built around feelings, not just likes
                                </h1>
                                <p className="text-sm leading-6 text-white/70">
                                    Every post now carries a mood signature, a hidden Behind the Frame layer,
                                    and an Echo Wall where people react with one defining word.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 text-sm md:max-w-xs">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Radar className="w-4 h-4 text-cyan-300" />
                                    Mood fingerprint
                                </div>
                                <p className="mt-1 text-white/[0.65]">
                                    Each post gets an emotional identity you can explore by vibe.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Layers3 className="w-4 h-4 text-amber-300" />
                                    Behind the Frame
                                </div>
                                <p className="mt-1 text-white/[0.65]">
                                    Creators can hide the real story behind an image and reveal it later.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Sparkles className="w-4 h-4 text-pink-300" />
                                    Echo Wall
                                </div>
                                <p className="mt-1 text-white/[0.65]">
                                    Reactions become a collective one-word emotion instead of generic comments.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {posts.length === 0 ? (
                    <div className="text-center py-20">
                        <h3 className="font-heading text-xl font-semibold mb-2">No posts yet</h3>
                        <p className="text-muted-foreground">
                            Follow some users or create your first post!
                        </p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onUpdate={handlePostUpdate}
                            onDelete={handlePostDelete}
                        />
                    ))
                )}

                {loadingMore && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                )}

                {!hasMore && posts.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>You've seen all the posts!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;

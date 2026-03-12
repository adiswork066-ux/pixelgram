import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/post/PostCard';
import { Loader2 } from 'lucide-react';

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

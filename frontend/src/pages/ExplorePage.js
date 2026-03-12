import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Search, TrendingUp, Heart, MessageCircle } from 'lucide-react';
import PostDetailModal from '@/components/modals/PostDetailModal';

const ExplorePage = () => {
    const { api } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [trendingPosts, setTrendingPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    const fetchTrendingPosts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api().get('/explore?page=1&page_size=20');
            setTrendingPosts(response.data);
        } catch (error) {
            console.error('Failed to fetch trending posts:', error);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchTrendingPosts();
    }, [fetchTrendingPosts]);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setSearching(true);
            try {
                const response = await api().get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(response.data);
            } catch (error) {
                console.error('Failed to search users:', error);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, api]);

    return (
        <div className="max-w-screen-lg mx-auto px-4 py-6" data-testid="explore-page">
            {/* Search Bar */}
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 rounded-xl bg-secondary border-none"
                        data-testid="search-input"
                    />
                    {searching && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                </div>

                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && (
                    <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
                        {searchResults.map((user) => (
                            <Link
                                key={user.id}
                                to={`/profile/${user.username}`}
                                className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors"
                                data-testid={`search-result-${user.id}`}
                            >
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.username}</p>
                                    {user.bio && (
                                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {searchQuery && searchResults.length === 0 && !searching && (
                    <div className="mt-4 text-center py-8 text-muted-foreground">
                        No users found
                    </div>
                )}
            </div>

            {/* Trending Posts */}
            {!searchQuery && (
                <>
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <h2 className="font-heading text-xl font-semibold">Discover</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : trendingPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">No posts to explore yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1 md:gap-4">
                            {trendingPosts.map((post) => (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="aspect-square relative group overflow-hidden rounded-lg"
                                    data-testid={`explore-post-${post.id}`}
                                >
                                    <img 
                                        src={post.image} 
                                        alt={post.caption || 'Post'} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                        <div className="flex items-center gap-2 text-white">
                                            <Heart className="w-5 h-5 fill-white" />
                                            <span className="font-semibold">{post.likes_count}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white">
                                            <MessageCircle className="w-5 h-5 fill-white" />
                                            <span className="font-semibold">{post.comments_count}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal 
                    post={selectedPost}
                    open={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </div>
    );
};

export default ExplorePage;
